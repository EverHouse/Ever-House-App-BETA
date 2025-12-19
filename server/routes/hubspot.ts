import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { getHubSpotClient } from '../core/integrations';

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
        tier: contact.properties.membership_tier || '',
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
      tier: contact.properties.membership_tier || '',
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
    res.json({ success: true, message: result.inlineMessage || 'Form submitted successfully' });
  } catch (error: any) {
    if (!isProduction) console.error('HubSpot form submission error:', error);
    res.status(500).json({ error: 'Form submission failed' });
  }
});

export default router;
