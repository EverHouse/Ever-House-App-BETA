import fs from 'fs';
import path from 'path';
import pg from 'pg';

const TIER_MAPPING: Record<string, { tier: string; tags: string[] }> = {
  'Core Membership': { tier: 'Core', tags: [] },
  'Core Membership Founding Members': { tier: 'Core', tags: ['Founding Member'] },
  'Premium Membership': { tier: 'Premium', tags: [] },
  'Premium Membership Founding Members': { tier: 'Premium', tags: ['Founding Member'] },
  'VIP Membership': { tier: 'VIP', tags: [] },
  'Corporate Membership': { tier: 'Corporate', tags: [] },
  'Approved Pre Sale Clients': { tier: 'Social', tags: ['Pre-Sale'] },
  'Social Membership': { tier: 'Social', tags: [] },
  'Social Membership Founding Members': { tier: 'Social', tags: ['Founding Member'] },
  'Junior Group Lessons Membership': { tier: 'Social', tags: ['Junior Lessons'] },
  'Group Lessons Membership': { tier: 'Social', tags: ['Group Lessons'] },
};

function parseTier(mindbodyTier: string): { tier: string; tags: string[] } {
  const tierKey = mindbodyTier.trim();
  if (TIER_MAPPING[tierKey]) {
    return TIER_MAPPING[tierKey];
  }
  console.warn(`Unknown tier: "${tierKey}" - defaulting to Social`);
  return { tier: 'Social', tags: [] };
}

function parseCSV(content: string): Array<Record<string, string>> {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows: Array<Record<string, string>> = [];
  
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

async function detectTierConflict(
  pool: pg.Pool,
  email: string,
  incomingTier: string,
  mindbodyId: string | null,
  firstName: string | null,
  lastName: string | null
): Promise<boolean> {
  const userResult = await pool.query(
    `SELECT id, email, tier, mindbody_client_id, first_name, last_name 
     FROM users 
     WHERE LOWER(email) = $1 OR mindbody_client_id = $2`,
    [email, mindbodyId]
  );

  if (userResult.rows.length === 0) {
    return false;
  }

  const user = userResult.rows[0];
  const currentTier = user.tier || 'Guest';

  if (currentTier.toLowerCase() !== incomingTier.toLowerCase()) {
    const existingConflict = await pool.query(
      `SELECT id FROM membership_tier_conflicts 
       WHERE email = $1 AND status = 'open' AND source = 'mindbody_csv'`,
      [email]
    );

    if (existingConflict.rows.length > 0) {
      await pool.query(
        `UPDATE membership_tier_conflicts 
         SET incoming_tier = $1, current_tier = $2, updated_at = NOW(), 
             metadata = $3::jsonb
         WHERE id = $4`,
        [
          incomingTier,
          currentTier,
          JSON.stringify({ firstName, lastName }),
          existingConflict.rows[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO membership_tier_conflicts 
         (user_id, email, mindbody_id, current_tier, incoming_tier, source, status, metadata)
         VALUES ($1, $2, $3, $4, $5, 'mindbody_csv', 'open', $6::jsonb)`,
        [
          user.id,
          email,
          mindbodyId || user.mindbody_client_id,
          currentTier,
          incomingTier,
          JSON.stringify({ 
            firstName: firstName || user.first_name, 
            lastName: lastName || user.last_name 
          })
        ]
      );
    }
    return true;
  }
  return false;
}

async function importMembers() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const csvPath = path.join(process.cwd(), 'attached_assets/even_house_cleaned_member_data_1766138702884.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const members = parseCSV(csvContent);
    
    console.log(`Found ${members.length} members in CSV`);
    
    let created = 0;
    let updated = 0;
    let conflicts = 0;
    let errors = 0;
    
    for (const member of members) {
      const email = member['real_email']?.toLowerCase().trim();
      if (!email) {
        console.warn(`Skipping row with no email:`, member);
        errors++;
        continue;
      }
      
      const { tier, tags } = parseTier(member['membership_tier'] || '');
      
      const linkedEmails: string[] = [];
      if (member['trackman_emails_linked']) {
        linkedEmails.push(...member['trackman_emails_linked'].split(';').map(e => e.trim()).filter(Boolean));
      }
      
      const lifetimeVisits = parseInt(member['total_bookings'] || '0', 10) || 0;
      
      const existingResult = await pool.query(
        'SELECT id, tags, tier FROM users WHERE email = $1',
        [email]
      );
      
      if (existingResult.rows.length > 0) {
        const existingTags = existingResult.rows[0].tags || [];
        const mergedTags = [...new Set([...existingTags, ...tags])];
        const existingTier = existingResult.rows[0].tier;
        
        const hasConflict = await detectTierConflict(
          pool,
          email,
          tier,
          member['mindbody_id'] || null,
          member['first_name'] || null,
          member['last_name'] || null
        );
        
        if (hasConflict) {
          conflicts++;
          await pool.query(
            `UPDATE users SET 
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              phone = COALESCE($3, phone),
              tags = $4,
              mindbody_client_id = COALESCE($5, mindbody_client_id),
              lifetime_visits = $6,
              linked_emails = $7,
              data_source = 'mindbody_import',
              updated_at = NOW()
            WHERE email = $8`,
            [
              member['first_name'] || null,
              member['last_name'] || null,
              member['phone'] || null,
              JSON.stringify(mergedTags),
              member['mindbody_id'] || null,
              lifetimeVisits,
              JSON.stringify(linkedEmails),
              email
            ]
          );
        } else {
          await pool.query(
            `UPDATE users SET 
              first_name = COALESCE($1, first_name),
              last_name = COALESCE($2, last_name),
              phone = COALESCE($3, phone),
              tier = $4,
              tags = $5,
              mindbody_client_id = COALESCE($6, mindbody_client_id),
              lifetime_visits = $7,
              linked_emails = $8,
              data_source = 'mindbody_import',
              updated_at = NOW()
            WHERE email = $9`,
            [
              member['first_name'] || null,
              member['last_name'] || null,
              member['phone'] || null,
              tier,
              JSON.stringify(mergedTags),
              member['mindbody_id'] || null,
              lifetimeVisits,
              JSON.stringify(linkedEmails),
              email
            ]
          );
        }
        updated++;
      } else {
        await pool.query(
          `INSERT INTO users (id, email, first_name, last_name, phone, tier, tags, mindbody_client_id, lifetime_visits, linked_emails, data_source, role)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, 'mindbody_import', 'member')`,
          [
            email,
            member['first_name'] || null,
            member['last_name'] || null,
            member['phone'] || null,
            tier,
            JSON.stringify(tags),
            member['mindbody_id'] || null,
            lifetimeVisits,
            JSON.stringify(linkedEmails)
          ]
        );
        created++;
      }
    }
    
    console.log(`\nImport complete!`);
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Tier Conflicts: ${conflicts} (review in Admin > Data Conflicts)`);
    console.log(`  Errors: ${errors}`);
    
    const stats = await pool.query(`
      SELECT tier, COUNT(*) as count 
      FROM users 
      WHERE data_source = 'mindbody_import' 
      GROUP BY tier 
      ORDER BY count DESC
    `);
    console.log(`\nTier breakdown:`);
    stats.rows.forEach(row => {
      console.log(`  ${row.tier}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

importMembers().catch(console.error);
