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

async function getUserRole(pool: pg.Pool, email: string): Promise<'admin' | 'staff' | 'member'> {
  const normalizedEmail = email.toLowerCase();
  
  const adminResult = await pool.query(
    `SELECT id FROM admin_users WHERE LOWER(email) = $1 AND is_active = true`,
    [normalizedEmail]
  );
  if (adminResult.rows.length > 0) {
    return 'admin';
  }
  
  const staffResult = await pool.query(
    `SELECT id FROM staff_users WHERE LOWER(email) = $1 AND is_active = true`,
    [normalizedEmail]
  );
  if (staffResult.rows.length > 0) {
    return 'staff';
  }
  
  return 'member';
}

async function migrateMembers() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    const csvPath = path.join(process.cwd(), 'even_house_cleaned_member_data.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.error('CSV file not found:', csvPath);
      process.exit(1);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const members = parseCSV(csvContent);
    
    console.log(`Found ${members.length} members in CSV`);
    
    let created = 0;
    let updated = 0;
    let skipped = 0;
    let duplicates = 0;
    const errors: string[] = [];
    
    const processedEmails = new Set<string>();
    
    for (const member of members) {
      const email = member.real_email?.toLowerCase().trim();
      const mindbodyId = member.mindbody_id?.trim();
      const firstName = member.first_name?.trim() || null;
      const lastName = member.last_name?.trim() || null;
      const phone = member.phone?.trim() || null;
      const mindbodyTier = member.membership_tier?.trim() || '';
      const totalBookings = parseInt(member.total_bookings) || 0;
      const linkedEmailsRaw = member.trackman_emails_linked?.trim() || '';
      
      if (!email) {
        skipped++;
        continue;
      }
      
      if (processedEmails.has(email)) {
        duplicates++;
        console.log(`Duplicate in CSV: ${email}`);
        continue;
      }
      processedEmails.add(email);
      
      try {
        const { tier, tags } = parseTier(mindbodyTier);
        
        const role = await getUserRole(pool, email);
        
        const linkedEmails = linkedEmailsRaw
          ? linkedEmailsRaw.split(',').map(e => e.trim()).filter(Boolean)
          : [];
        
        const existingUser = await pool.query(
          `SELECT id, tier, tags, lifetime_visits, role FROM users WHERE LOWER(email) = $1`,
          [email]
        );
        
        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0];
          const existingTags = Array.isArray(user.tags) ? user.tags : [];
          const mergedTags = [...new Set([...existingTags, ...tags])];
          const maxVisits = Math.max(user.lifetime_visits || 0, totalBookings);
          
          const effectiveRole = role !== 'member' ? role : user.role;
          
          await pool.query(
            `UPDATE users SET 
               first_name = COALESCE($1, first_name),
               last_name = COALESCE($2, last_name),
               phone = COALESCE($3, phone),
               tier = $4,
               tags = $5::jsonb,
               mindbody_client_id = COALESCE($6, mindbody_client_id),
               lifetime_visits = $7,
               linked_emails = $8::jsonb,
               role = $9,
               data_source = 'mindbody_csv',
               updated_at = NOW()
             WHERE LOWER(email) = $10`,
            [
              firstName,
              lastName,
              phone,
              tier,
              JSON.stringify(mergedTags),
              mindbodyId,
              maxVisits,
              JSON.stringify(linkedEmails),
              effectiveRole,
              email
            ]
          );
          updated++;
        } else {
          await pool.query(
            `INSERT INTO users (
               email, first_name, last_name, phone, tier, tags, 
               mindbody_client_id, lifetime_visits, linked_emails, role, data_source
             ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb, $10, 'mindbody_csv')`,
            [
              email,
              firstName,
              lastName,
              phone,
              tier,
              JSON.stringify(tags),
              mindbodyId,
              totalBookings,
              JSON.stringify(linkedEmails),
              role
            ]
          );
          created++;
        }
      } catch (error: any) {
        errors.push(`${email}: ${error.message}`);
      }
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Created: ${created}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no email): ${skipped}`);
    console.log(`Duplicates in CSV: ${duplicates}`);
    
    if (errors.length > 0) {
      console.log(`\nErrors (${errors.length}):`);
      errors.forEach(e => console.log(`  - ${e}`));
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrateMembers();
