import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { getHubSpotClient } from '../core/integrations';
import { db } from '../db';
import { formSubmissions } from '../../shared/schema';
import { notifyAllStaff } from '../core/staffNotifications';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();

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

const normalizeMembershipTier = (tier: string | undefined): string => {
  if (!tier) return 'Core';
  const tierLower = tier.toLowerCase();
  if (tierLower.includes('vip')) return 'VIP';
  if (tierLower.includes('premium')) return 'Premium';
  if (tierLower.includes('corporate')) return 'Corporate';
  if (tierLower.includes('core')) return 'Core';
  if (tierLower.includes('social')) return 'Social';
  return 'Core';
};

router.get('/api/hubspot/contacts', async (req, res) => {
  try {
    const hubspot = await getHubSpotClient();
    
    const properties = [
      'firstname',
      'lastname',
      'email',
      'phone',
      'company',
      'hs_lead_status',
      'createdate',
      'membership_tier',
      'membership_status',
      'membership_discount_reason'
    ];
    
    let allContacts: any[] = [];
    let after: string | undefined = undefined;
    
    do {
      const response = await hubspot.crm.contacts.basicApi.getPage(100, after, properties);
      allContacts = allContacts.concat(response.results);
      after = response.paging?.next?.after;
    } while (after);

    const contacts = allContacts
      .map((contact: any) => ({
        id: contact.id,
        firstName: contact.properties.firstname || '',
        lastName: contact.properties.lastname || '',
        email: contact.properties.email || '',
        phone: contact.properties.phone || '',
        company: contact.properties.company || '',
        status: contact.properties.membership_status || contact.properties.hs_lead_status || '',
        tier: normalizeMembershipTier(contact.properties.membership_tier),
        tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
        createdAt: contact.properties.createdate
      }))
      .filter((contact: any) => contact.status.toLowerCase() === 'active');
    
    res.json(contacts);
  } catch (error: any) {
    if (!isProduction) console.error('HubSpot error:', error);
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.get('/api/hubspot/contacts/:id', async (req, res) => {
  try {
    const hubspot = await getHubSpotClient();
    const { id } = req.params;
    
    const contact = await hubspot.crm.contacts.basicApi.getById(id, [
      'firstname',
      'lastname',
      'email',
      'phone',
      'company',
      'hs_lead_status',
      'createdate',
      'membership_tier',
      'membership_status',
      'membership_discount_reason'
    ]);

    res.json({
      id: contact.id,
      firstName: contact.properties.firstname || '',
      lastName: contact.properties.lastname || '',
      email: contact.properties.email || '',
      phone: contact.properties.phone || '',
      company: contact.properties.company || '',
      status: contact.properties.membership_status || contact.properties.hs_lead_status || 'Active',
      tier: normalizeMembershipTier(contact.properties.membership_tier),
      tags: parseDiscountReasonToTags(contact.properties.membership_discount_reason),
      createdAt: contact.properties.createdate
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

const HUBSPOT_FORMS: Record<string, string> = {
  'tour-request': process.env.HUBSPOT_FORM_TOUR_REQUEST || '',
  'membership': process.env.HUBSPOT_FORM_MEMBERSHIP || '',
  'private-hire': process.env.HUBSPOT_FORM_PRIVATE_HIRE || '',
  'guest-checkin': process.env.HUBSPOT_FORM_GUEST_CHECKIN || '',
  'contact': process.env.HUBSPOT_FORM_CONTACT || ''
};

router.post('/api/hubspot/forms/:formType', async (req, res) => {
  try {
    const { formType } = req.params;
    const formId = HUBSPOT_FORMS[formType];
    const portalId = process.env.HUBSPOT_PORTAL_ID;
    
    if (!formId || !portalId) {
      return res.status(400).json({ error: 'Invalid form type or missing configuration' });
    }
    
    const { fields, context } = req.body;
    
    if (formType === 'guest-checkin') {
      const memberEmailField = fields.find((f: { name: string; value: string }) => f.name === 'member_email');
      if (!memberEmailField?.value) {
        return res.status(400).json({ error: 'Member email is required for guest check-in' });
      }
      
      const memberEmail = memberEmailField.value;
      
      const updateResult = await pool.query(
        `UPDATE guest_passes 
         SET passes_used = passes_used + 1 
         WHERE member_email = $1 AND passes_used < passes_total
         RETURNING passes_used, passes_total`,
        [memberEmail]
      );
      
      if (updateResult.rows.length === 0) {
        const passCheck = await pool.query(
          'SELECT passes_used, passes_total FROM guest_passes WHERE member_email = $1',
          [memberEmail]
        );
        
        if (passCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Guest pass record not found. Please contact staff.' });
        }
        
        return res.status(400).json({ error: 'No guest passes remaining. Please contact staff for assistance.' });
      }
    }
    
    const hubspotPayload = {
      fields: fields.map((f: { name: string; value: string }) => ({
        objectTypeId: '0-1',
        name: f.name,
        value: f.value
      })),
      context: {
        pageUri: context?.pageUri || '',
        pageName: context?.pageName || '',
        ...(context?.hutk && { hutk: context.hutk })
      }
    };
    
    const response = await fetch(
      `https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hubspotPayload)
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json();
      if (!isProduction) console.error('HubSpot form error:', errorData);
      return res.status(response.status).json({ error: 'Form submission failed' });
    }
    
    const result: any = await response.json();
    
    const getFieldValue = (name: string): string | undefined => {
      const field = fields.find((f: { name: string; value: string }) => f.name === name);
      return field?.value;
    };
    
    try {
      const metadata: Record<string, string> = {};
      for (const field of fields) {
        if (!['firstname', 'lastname', 'email', 'phone', 'message'].includes(field.name)) {
          metadata[field.name] = field.value;
        }
      }
      
      const insertResult = await db.insert(formSubmissions).values({
        formType,
        firstName: getFieldValue('firstname') || getFieldValue('first_name') || null,
        lastName: getFieldValue('lastname') || getFieldValue('last_name') || null,
        email: getFieldValue('email') || '',
        phone: getFieldValue('phone') || null,
        message: getFieldValue('message') || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        status: 'new',
      }).returning();
      
      const formTypeLabels: Record<string, string> = {
        'tour-request': 'Tour Request',
        'membership': 'Membership Inquiry',
        'private-hire': 'Private Hire Inquiry',
        'guest-checkin': 'Guest Check-in',
        'contact': 'Contact Form'
      };
      const formLabel = formTypeLabels[formType] || 'Form Submission';
      const submitterName = [getFieldValue('firstname') || getFieldValue('first_name'), getFieldValue('lastname') || getFieldValue('last_name')].filter(Boolean).join(' ') || getFieldValue('email') || 'Someone';
      const staffMessage = `${submitterName} submitted a ${formLabel}`;
      
      notifyAllStaff(
        `New ${formLabel}`,
        staffMessage,
        'inquiry',
        insertResult[0]?.id ?? undefined,
        'form_submission'
      ).catch(err => console.error('Staff inquiry notification failed:', err));
    } catch (dbError: any) {
      console.error('Failed to save form submission locally:', dbError);
    }
    
    res.json({ success: true, message: result.inlineMessage || 'Form submitted successfully' });
  } catch (error: any) {
    if (!isProduction) console.error('HubSpot form submission error:', error);
    res.status(500).json({ error: 'Form submission failed' });
  }
});

// CSV parsing helper
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Sync membership tiers from CSV to HubSpot
router.post('/api/hubspot/sync-tiers', async (req, res) => {
  try {
    const { dryRun = true } = req.body;
    const hubspot = await getHubSpotClient();
    
    // Find the latest cleaned CSV file
    const assetsDir = path.join(process.cwd(), 'attached_assets');
    const files = fs.readdirSync(assetsDir)
      .filter(f => f.startsWith('even_house_cleaned_member_data') && f.endsWith('.csv'))
      .sort()
      .reverse();
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No cleaned member data CSV found' });
    }
    
    const csvPath = path.join(assetsDir, files[0]);
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const csvRows = parseCSV(csvContent);
    
    console.log(`[Tier Sync] Loaded ${csvRows.length} rows from ${files[0]}`);
    
    // Build lookup map from CSV by email (normalized)
    const csvByEmail = new Map<string, { tier: string; mindbodyId: string; name: string }>();
    for (const row of csvRows) {
      const email = (row.real_email || '').toLowerCase().trim();
      if (email) {
        csvByEmail.set(email, {
          tier: row.membership_tier || '',
          mindbodyId: row.mindbody_id || '',
          name: `${row.first_name || ''} ${row.last_name || ''}`.trim()
        });
      }
    }
    
    // Fetch all HubSpot contacts
    const properties = ['firstname', 'lastname', 'email', 'membership_tier', 'mindbody_client_id'];
    let allContacts: any[] = [];
    let after: string | undefined = undefined;
    
    do {
      const response = await hubspot.crm.contacts.basicApi.getPage(100, after, properties);
      allContacts = allContacts.concat(response.results);
      after = response.paging?.next?.after;
    } while (after);
    
    console.log(`[Tier Sync] Fetched ${allContacts.length} contacts from HubSpot`);
    
    // Match and prepare updates
    const results = {
      matched: 0,
      updated: 0,
      skipped: 0,
      notFound: 0,
      errors: [] as string[],
      updates: [] as { email: string; name: string; oldTier: string; newTier: string }[]
    };
    
    const updateBatch: { id: string; properties: { membership_tier: string } }[] = [];
    
    for (const contact of allContacts) {
      const hubspotEmail = (contact.properties.email || '').toLowerCase().trim();
      if (!hubspotEmail) continue;
      
      const csvData = csvByEmail.get(hubspotEmail);
      if (!csvData) {
        results.notFound++;
        continue;
      }
      
      results.matched++;
      const currentTier = contact.properties.membership_tier || '';
      const newTier = csvData.tier;
      
      // Skip if tiers match (case-insensitive comparison)
      if (currentTier.toLowerCase() === newTier.toLowerCase()) {
        results.skipped++;
        continue;
      }
      
      // Queue for update
      results.updates.push({
        email: hubspotEmail,
        name: csvData.name,
        oldTier: currentTier || '(empty)',
        newTier: newTier
      });
      
      updateBatch.push({
        id: contact.id,
        properties: { membership_tier: newTier }
      });
    }
    
    // Execute updates if not dry run
    if (!dryRun && updateBatch.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < updateBatch.length; i += batchSize) {
        const batch = updateBatch.slice(i, i + batchSize);
        try {
          await hubspot.crm.contacts.batchApi.update({
            inputs: batch
          });
          results.updated += batch.length;
          console.log(`[Tier Sync] Updated batch ${Math.floor(i / batchSize) + 1}: ${batch.length} contacts`);
        } catch (err: any) {
          results.errors.push(`Batch ${Math.floor(i / batchSize) + 1} failed: ${err.message}`);
          console.error(`[Tier Sync] Batch update error:`, err);
        }
      }
    } else if (dryRun) {
      results.updated = 0;
    }
    
    console.log(`[Tier Sync] Complete - Matched: ${results.matched}, Updates: ${results.updates.length}, Errors: ${results.errors.length}`);
    
    res.json({
      success: true,
      dryRun,
      csvFile: files[0],
      csvRowCount: csvRows.length,
      hubspotContactCount: allContacts.length,
      matched: results.matched,
      toUpdate: results.updates.length,
      updated: results.updated,
      skipped: results.skipped,
      notFoundInCSV: results.notFound,
      errors: results.errors,
      updates: results.updates.slice(0, 50) // Limit preview to first 50
    });
  } catch (error: any) {
    console.error('[Tier Sync] Error:', error);
    res.status(500).json({ error: 'Tier sync failed: ' + error.message });
  }
});

export default router;
