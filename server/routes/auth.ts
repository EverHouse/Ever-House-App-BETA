import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { Resend } from 'resend';
import { eq, and, sql, gt, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { users, magicLinks, adminUsers, staffUsers } from '../../shared/schema';
import { isProduction } from '../core/db';
import { getHubSpotClient } from '../core/integrations';
import { isAdminEmail } from '../core/middleware';

async function isStaffEmail(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const result = await db.select({ id: staffUsers.id })
      .from(staffUsers)
      .where(and(
        sql`LOWER(${staffUsers.email}) = LOWER(${email})`,
        eq(staffUsers.isActive, true)
      ));
    return result.length > 0;
  } catch (error) {
    console.error('Error checking staff status:', error);
    return false;
  }
}

async function getUserRole(email: string): Promise<'admin' | 'staff' | 'member'> {
  const normalizedEmail = email.toLowerCase();
  if (await isAdminEmail(normalizedEmail)) {
    return 'admin';
  }
  if (await isStaffEmail(normalizedEmail)) {
    return 'staff';
  }
  return 'member';
}

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const otpRequestLimiter: Map<string, { count: number; resetAt: number }> = new Map();
const otpVerifyAttempts: Map<string, { count: number; lockedUntil: number }> = new Map();
const magicLinkRequestLimiter: Map<string, { count: number; resetAt: number }> = new Map();

const OTP_REQUEST_LIMIT = 3;
const OTP_REQUEST_WINDOW = 15 * 60 * 1000;
const MAGIC_LINK_REQUEST_LIMIT = 3;
const MAGIC_LINK_REQUEST_WINDOW = 15 * 60 * 1000;
const OTP_VERIFY_MAX_ATTEMPTS = 5;
const OTP_VERIFY_LOCKOUT = 15 * 60 * 1000;

const checkOtpRequestLimit = (email: string, ip: string): { allowed: boolean; retryAfter?: number } => {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const record = otpRequestLimiter.get(key);
  
  if (!record || now > record.resetAt) {
    otpRequestLimiter.set(key, { count: 1, resetAt: now + OTP_REQUEST_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= OTP_REQUEST_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
};

const checkMagicLinkRequestLimit = (email: string, ip: string): { allowed: boolean; retryAfter?: number } => {
  const key = `${email}:${ip}`;
  const now = Date.now();
  const record = magicLinkRequestLimiter.get(key);
  
  if (!record || now > record.resetAt) {
    magicLinkRequestLimiter.set(key, { count: 1, resetAt: now + MAGIC_LINK_REQUEST_WINDOW });
    return { allowed: true };
  }
  
  if (record.count >= MAGIC_LINK_REQUEST_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((record.resetAt - now) / 1000) };
  }
  
  record.count++;
  return { allowed: true };
};

const checkOtpVerifyAttempts = (email: string): { allowed: boolean; retryAfter?: number } => {
  const now = Date.now();
  const record = otpVerifyAttempts.get(email);
  
  if (!record) {
    return { allowed: true };
  }
  
  if (record.lockedUntil > 0 && now < record.lockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  }
  
  if (record.lockedUntil > 0 && now >= record.lockedUntil) {
    otpVerifyAttempts.delete(email);
    return { allowed: true };
  }
  
  return { allowed: true };
};

const recordOtpVerifyFailure = (email: string): void => {
  const now = Date.now();
  const record = otpVerifyAttempts.get(email);
  
  if (!record) {
    otpVerifyAttempts.set(email, { count: 1, lockedUntil: 0 });
    return;
  }
  
  record.count++;
  if (record.count >= OTP_VERIFY_MAX_ATTEMPTS) {
    record.lockedUntil = now + OTP_VERIFY_LOCKOUT;
  }
};

const clearOtpVerifyAttempts = (email: string): void => {
  otpVerifyAttempts.delete(email);
};

const parseDiscountReasonToTags = (reason: string | undefined): string[] => {
  if (!reason) return [];
  const tags: string[] = [];
  const lowerReason = reason.toLowerCase();
  if (lowerReason.includes('founding')) tags.push('Founding Member');
  if (lowerReason.includes('investor')) tags.push('Investor');
  if (lowerReason.includes('vip') || lowerReason.includes('guest')) tags.push('VIP Guest');
  if (lowerReason.includes('referral')) tags.push('Referral');
  return tags;
};

router.post('/api/auth/verify-member', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: email.toLowerCase()
        }]
      }],
      properties: [
        'firstname',
        'lastname',
        'email',
        'phone',
        'membership_tier',
        'membership_status',
        'membership_discount_reason',
        'mindbody_client_id'
      ],
      limit: 1
    });
    
    if (searchResponse.results.length === 0) {
      return res.status(404).json({ error: 'No member found with this email address' });
    }
    
    const contact = searchResponse.results[0];
    const status = (contact.properties.membership_status || '').toLowerCase();
    
    if (status !== 'active') {
      return res.status(403).json({ error: 'Your membership is not active. Please contact us for assistance.' });
    }
    
    const role = await getUserRole(email.toLowerCase());

    const member = {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || email,
      phone: contact.properties.phone || '',
      tier: contact.properties.membership_tier || 'Core',
      tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
      mindbodyClientId: contact.properties.mindbody_client_id || '',
      status: 'Active',
      role
    };
    
    res.json({ success: true, member });
  } catch (error: any) {
    if (!isProduction) console.error('Member verification error:', error);
    res.status(500).json({ error: 'Failed to verify membership' });
  }
});

router.post('/api/auth/magic-link', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!resend) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    const rateCheck = checkMagicLinkRequestLimit(normalizedEmail, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many login requests. Please try again in ${Math.ceil((rateCheck.retryAfter || 0) / 60)} minutes.` 
      });
    }
    
    const isAdmin = await isAdminEmail(normalizedEmail);
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: normalizedEmail
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'membership_status'],
      limit: 1
    });
    
    let contact = searchResponse.results[0];
    let firstName = 'Admin';
    
    if (!contact && !isAdmin) {
      return res.status(404).json({ error: 'No member found with this email address' });
    }
    
    if (contact) {
      const status = (contact.properties.membership_status || '').toLowerCase();
      firstName = contact.properties.firstname || 'Member';
      
      if (status !== 'active' && !isAdmin) {
        return res.status(403).json({ error: 'Your membership is not active. Please contact us for assistance.' });
      }
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await db.insert(magicLinks).values({
      email: email.toLowerCase(),
      token,
      expiresAt
    });
    
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
        : 'http://localhost:5000';
    
    const magicLink = `${baseUrl}/#/verify?token=${token}`;
    
    const emailResult = await resend.emails.send({
      from: 'Even House <noreply@everhouse.app>',
      to: normalizedEmail,
      subject: 'Your Even House Login Link',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: #293515; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">EH</div>
          </div>
          <h1 style="color: #293515; font-size: 24px; text-align: center; margin-bottom: 16px;">Hi ${firstName},</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 32px;">
            Click the button below to sign in to your Even House member portal. This link expires in 15 minutes.
          </p>
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${magicLink}" style="display: inline-block; background: #293515; color: white; padding: 16px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 16px;">
              Sign In to Even House
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            If you didn't request this link, you can safely ignore this email.
          </p>
        </div>
      `
    });
    
    console.log('Resend email result:', JSON.stringify(emailResult));
    
    if (emailResult.error) {
      console.error('Resend error:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send email: ' + emailResult.error.message });
    }
    
    res.json({ success: true, message: 'Magic link sent to your email' });
  } catch (error: any) {
    console.error('Magic link error:', error?.message || error);
    
    if (error?.message?.includes('HubSpot') || error?.message?.includes('hubspot')) {
      return res.status(500).json({ error: 'Unable to verify membership. Please try again later.' });
    }
    if (error?.message?.includes('Resend') || error?.message?.includes('email')) {
      return res.status(500).json({ error: 'Unable to send email. Please try again later.' });
    }
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND') {
      return res.status(500).json({ error: 'Service temporarily unavailable. Please try again.' });
    }
    
    res.status(500).json({ error: 'Failed to send magic link. Please try again.' });
  }
});

router.post('/api/auth/request-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    if (!resend) {
      return res.status(500).json({ error: 'Email service not configured' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    
    const rateCheck = checkOtpRequestLimit(normalizedEmail, clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many code requests. Please try again in ${Math.ceil((rateCheck.retryAfter || 0) / 60)} minutes.` 
      });
    }
    
    const isAdmin = await isAdminEmail(normalizedEmail);
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: normalizedEmail
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'membership_status'],
      limit: 1
    });
    
    let contact = searchResponse.results[0];
    let firstName = 'Admin';
    
    if (!contact && !isAdmin) {
      return res.status(404).json({ error: 'No member found with this email address' });
    }
    
    if (contact) {
      const status = (contact.properties.membership_status || '').toLowerCase();
      firstName = contact.properties.firstname || 'Member';
      
      if (status !== 'active' && !isAdmin) {
        return res.status(403).json({ error: 'Your membership is not active. Please contact us for assistance.' });
      }
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    
    await db.insert(magicLinks).values({
      email: normalizedEmail,
      token: code,
      expiresAt
    });
    
    const emailResult = await resend.emails.send({
      from: 'Even House <noreply@everhouse.app>',
      to: normalizedEmail,
      subject: 'Your Even House Login Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="width: 64px; height: 64px; background: #293515; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold;">EH</div>
          </div>
          <h1 style="color: #293515; font-size: 24px; text-align: center; margin-bottom: 16px;">Hi ${firstName},</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 24px;">
            Enter this code in the Even House app to sign in:
          </p>
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="display: inline-block; background: #f5f5f5; padding: 20px 40px; border-radius: 12px; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #293515; font-family: monospace;">
              ${code}
            </div>
          </div>
          <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 32px;">
            This code expires in 15 minutes.
          </p>
          <p style="color: #999; font-size: 14px; text-align: center;">
            If you didn't request this code, you can safely ignore this email.
          </p>
        </div>
      `
    });
    
    console.log('Resend OTP email result:', JSON.stringify(emailResult));
    
    if (emailResult.error) {
      console.error('Resend OTP error:', emailResult.error);
      return res.status(500).json({ error: 'Failed to send code: ' + emailResult.error.message });
    }
    
    res.json({ success: true, message: 'Login code sent to your email' });
  } catch (error: any) {
    console.error('OTP request error:', error?.message || error);
    
    if (error?.message?.includes('HubSpot') || error?.message?.includes('hubspot')) {
      return res.status(500).json({ error: 'Unable to verify membership. Please try again later.' });
    }
    if (error?.message?.includes('Resend') || error?.message?.includes('email')) {
      return res.status(500).json({ error: 'Unable to send email. Please try again later.' });
    }
    
    res.status(500).json({ error: 'Failed to send login code. Please try again.' });
  }
});

router.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const normalizedCode = code.toString().trim();
    
    const attemptCheck = checkOtpVerifyAttempts(normalizedEmail);
    if (!attemptCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many failed attempts. Please try again in ${Math.ceil((attemptCheck.retryAfter || 0) / 60)} minutes.` 
      });
    }
    
    const result = await db.select()
      .from(magicLinks)
      .where(and(
        eq(magicLinks.email, normalizedEmail),
        eq(magicLinks.token, normalizedCode),
        eq(magicLinks.used, false),
        gt(magicLinks.expiresAt, new Date())
      ))
      .orderBy(sql`${magicLinks.createdAt} DESC`)
      .limit(1);
    
    if (result.length === 0) {
      recordOtpVerifyFailure(normalizedEmail);
      const currentAttempts = otpVerifyAttempts.get(normalizedEmail);
      const attemptsLeft = OTP_VERIFY_MAX_ATTEMPTS - (currentAttempts?.count || 0);
      return res.status(400).json({ 
        error: attemptsLeft > 0 
          ? `Invalid code. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} remaining.`
          : 'Too many failed attempts. Please request a new code.'
      });
    }
    
    clearOtpVerifyAttempts(normalizedEmail);
    
    const otpRecord = result[0];
    
    await db.update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, otpRecord.id));
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: normalizedEmail
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'membership_tier', 'membership_status', 'membership_discount_reason', 'mindbody_client_id'],
      limit: 1
    });
    
    if (searchResponse.results.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const contact = searchResponse.results[0];
    
    const role = await getUserRole(normalizedEmail);

    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const member = {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || normalizedEmail,
      phone: contact.properties.phone || '',
      tier: contact.properties.membership_tier || 'Core',
      tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
      mindbodyClientId: contact.properties.mindbody_client_id || '',
      status: 'Active',
      role,
      expires_at: Date.now() + sessionTtl
    };
    
    (req.session as any).user = member;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ success: true, member });
    });
  } catch (error: any) {
    if (!isProduction) console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

router.post('/api/auth/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const result = await db.select()
      .from(magicLinks)
      .where(and(
        eq(magicLinks.token, token),
        eq(magicLinks.used, false),
        gt(magicLinks.expiresAt, new Date())
      ));
    
    if (result.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired link. Please request a new one.' });
    }
    
    const magicLinkRecord = result[0];
    
    await db.update(magicLinks)
      .set({ used: true })
      .where(eq(magicLinks.id, magicLinkRecord.id));
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: magicLinkRecord.email
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'membership_tier', 'membership_status', 'membership_discount_reason', 'mindbody_client_id'],
      limit: 1
    });
    
    if (searchResponse.results.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const contact = searchResponse.results[0];
    
    const role = await getUserRole(magicLinkRecord.email.toLowerCase());

    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const member = {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || magicLinkRecord.email,
      phone: contact.properties.phone || '',
      tier: contact.properties.membership_tier || 'Core',
      tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
      mindbodyClientId: contact.properties.mindbody_client_id || '',
      status: 'Active',
      role,
      expires_at: Date.now() + sessionTtl
    };
    
    (req.session as any).user = member;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ success: true, member });
    });
  } catch (error: any) {
    if (!isProduction) console.error('Token verification error:', error);
    res.status(500).json({ error: 'Failed to verify token' });
  }
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

router.get('/api/auth/check-staff-admin', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    const adminResult = await db.select({
      id: adminUsers.id,
      hasPassword: isNotNull(adminUsers.passwordHash)
    })
      .from(adminUsers)
      .where(and(
        eq(adminUsers.email, normalizedEmail),
        eq(adminUsers.isActive, true)
      ));
    
    if (adminResult.length > 0) {
      return res.json({ 
        isStaffOrAdmin: true, 
        role: 'admin',
        hasPassword: adminResult[0].hasPassword 
      });
    }
    
    const staffResult = await db.select({
      id: staffUsers.id,
      hasPassword: isNotNull(staffUsers.passwordHash)
    })
      .from(staffUsers)
      .where(and(
        eq(staffUsers.email, normalizedEmail),
        eq(staffUsers.isActive, true)
      ));
    
    if (staffResult.length > 0) {
      return res.json({ 
        isStaffOrAdmin: true, 
        role: 'staff',
        hasPassword: staffResult[0].hasPassword 
      });
    }
    
    res.json({ isStaffOrAdmin: false, role: null, hasPassword: false });
  } catch (error: any) {
    if (!isProduction) console.error('Check staff/admin error:', error);
    res.status(500).json({ error: 'Failed to check user status' });
  }
});

router.post('/api/auth/password-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const normalizedEmail = email.toLowerCase();
    
    let userRecord: { id: number; email: string; name: string | null; passwordHash: string | null } | null = null;
    let userRole = 'member';
    
    const adminResult = await db.select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      passwordHash: adminUsers.passwordHash
    })
      .from(adminUsers)
      .where(and(
        eq(adminUsers.email, normalizedEmail),
        eq(adminUsers.isActive, true)
      ));
    
    if (adminResult.length > 0) {
      userRecord = adminResult[0];
      userRole = 'admin';
    } else {
      const staffResult = await db.select({
        id: staffUsers.id,
        email: staffUsers.email,
        name: staffUsers.name,
        passwordHash: staffUsers.passwordHash
      })
        .from(staffUsers)
        .where(and(
          eq(staffUsers.email, normalizedEmail),
          eq(staffUsers.isActive, true)
        ));
      
      if (staffResult.length > 0) {
        userRecord = staffResult[0];
        userRole = 'staff';
      }
    }
    
    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!userRecord.passwordHash) {
      return res.status(400).json({ error: 'Password not set. Please use magic link or contact an admin.' });
    }
    
    const isValid = await bcrypt.compare(password, userRecord.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const hubspot = await getHubSpotClient();
    let memberData = null;
    
    try {
      const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
        filterGroups: [{
          filters: [{
            propertyName: 'email',
            operator: 'EQ' as any,
            value: normalizedEmail
          }]
        }],
        properties: ['firstname', 'lastname', 'email', 'phone', 'membership_tier', 'membership_status', 'membership_discount_reason', 'mindbody_client_id'],
        limit: 1
      });
      
      if (searchResponse.results.length > 0) {
        const contact = searchResponse.results[0];
        memberData = {
          id: contact.id,
          firstName: contact.properties.firstname || userRecord.name?.split(' ')[0] || '',
          lastName: contact.properties.lastname || userRecord.name?.split(' ').slice(1).join(' ') || '',
          email: normalizedEmail,
          phone: contact.properties.phone || '',
          tier: contact.properties.membership_tier || 'Core',
          tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
          mindbodyClientId: contact.properties.mindbody_client_id || '',
        };
      }
    } catch (hubspotError) {
      if (!isProduction) console.error('HubSpot lookup failed:', hubspotError);
    }
    
    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const member = {
      id: memberData?.id || userRecord.id.toString(),
      firstName: memberData?.firstName || userRecord.name?.split(' ')[0] || '',
      lastName: memberData?.lastName || userRecord.name?.split(' ').slice(1).join(' ') || '',
      email: normalizedEmail,
      phone: memberData?.phone || '',
      tier: memberData?.tier || 'Core',
      tags: memberData?.tags || [],
      mindbodyClientId: memberData?.mindbodyClientId || '',
      status: 'Active',
      role: userRole,
      expires_at: Date.now() + sessionTtl
    };
    
    (req.session as any).user = member;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ success: true, member });
    });
  } catch (error: any) {
    if (!isProduction) console.error('Password login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

router.post('/api/auth/set-password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const normalizedEmail = email.toLowerCase();
    const passwordHash = await bcrypt.hash(password, 10);
    
    const adminResult = await db.update(adminUsers)
      .set({ passwordHash })
      .where(and(
        eq(adminUsers.email, normalizedEmail),
        eq(adminUsers.isActive, true)
      ))
      .returning({ id: adminUsers.id });
    
    if (adminResult.length > 0) {
      return res.json({ success: true, message: 'Password set successfully' });
    }
    
    const staffResult = await db.update(staffUsers)
      .set({ passwordHash })
      .where(and(
        eq(staffUsers.email, normalizedEmail),
        eq(staffUsers.isActive, true)
      ))
      .returning({ id: staffUsers.id });
    
    if (staffResult.length > 0) {
      return res.json({ success: true, message: 'Password set successfully' });
    }
    
    res.status(404).json({ error: 'User not found' });
  } catch (error: any) {
    if (!isProduction) console.error('Set password error:', error);
    res.status(500).json({ error: 'Failed to set password' });
  }
});

router.post('/api/auth/dev-login', async (req, res) => {
  if (isProduction) {
    return res.status(403).json({ error: 'Dev login not available in production' });
  }
  
  if (process.env.DEV_LOGIN_ENABLED !== 'true') {
    return res.status(403).json({ error: 'Dev login not enabled' });
  }
  
  try {
    const testEmail = 'testuser@evenhouse.club';
    
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, testEmail));
    
    let userId: string;
    if (existingUser.length === 0) {
      const newUser = await db.insert(users)
        .values({
          email: testEmail,
          role: 'admin',
          tier: 'Premium',
          firstName: 'Test',
          lastName: 'Admin'
        })
        .returning({ id: users.id });
      userId = newUser[0].id;
    } else {
      userId = existingUser[0].id;
      await db.update(users)
        .set({ role: 'admin' })
        .where(eq(users.email, testEmail));
    }
    
    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const member = {
      id: userId,
      firstName: 'Test',
      lastName: 'Admin',
      email: testEmail,
      phone: '',
      tier: 'Premium',
      status: 'Active',
      role: 'admin',
      expires_at: Date.now() + sessionTtl
    };
    
    (req.session as any).user = member;
    
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Failed to create session' });
      }
      res.json({ success: true, member });
    });
  } catch (error: any) {
    console.error('Dev login error:', error);
    res.status(500).json({ error: 'Dev login failed' });
  }
});

export default router;
