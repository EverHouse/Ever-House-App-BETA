import { Router } from 'express';
import crypto from 'crypto';
import { Resend } from 'resend';
import { pool, isProduction } from '../core/db';
import { getHubSpotClient } from '../core/integrations';
import { isAdminEmail } from '../core/middleware';

const router = Router();
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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
    
    const adminStatus = await isAdminEmail(email.toLowerCase());

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
      role: adminStatus ? 'admin' : 'member'
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
    
    await pool.query(
      'INSERT INTO magic_links (email, token, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), token, expiresAt]
    );
    
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

router.post('/api/auth/verify-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    const result = await pool.query(
      'SELECT * FROM magic_links WHERE token = $1 AND used = FALSE AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired link. Please request a new one.' });
    }
    
    const magicLink = result.rows[0];
    
    await pool.query('UPDATE magic_links SET used = TRUE WHERE id = $1', [magicLink.id]);
    
    const hubspot = await getHubSpotClient();
    
    const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ' as any,
          value: magicLink.email
        }]
      }],
      properties: ['firstname', 'lastname', 'email', 'phone', 'membership_tier', 'membership_status', 'membership_discount_reason', 'mindbody_client_id'],
      limit: 1
    });
    
    if (searchResponse.results.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const contact = searchResponse.results[0];
    
    const adminStatus = await isAdminEmail(magicLink.email.toLowerCase());

    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const member = {
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || magicLink.email,
      phone: contact.properties.phone || '',
      tier: contact.properties.membership_tier || 'Core',
      tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
      mindbodyClientId: contact.properties.mindbody_client_id || '',
      status: 'Active',
      role: adminStatus ? 'admin' : 'member',
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

router.post('/api/auth/dev-login', async (req, res) => {
  if (isProduction) {
    return res.status(403).json({ error: 'Dev login not available in production' });
  }
  
  try {
    const testEmail = 'testuser@evenhouse.club';
    
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [testEmail]
    );
    
    let userId: string;
    if (existingUser.rows.length === 0) {
      const newUser = await pool.query(
        `INSERT INTO users (id, email, role, tier, first_name, last_name, created_at) 
         VALUES (gen_random_uuid(), $1, 'admin', 'Premium', 'Test', 'Admin', NOW()) 
         RETURNING id`,
        [testEmail]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = existingUser.rows[0].id;
      await pool.query('UPDATE users SET role = $1 WHERE email = $2', ['admin', testEmail]);
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
