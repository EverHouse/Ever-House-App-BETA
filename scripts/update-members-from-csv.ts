import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MemberData {
  mindbody_id: string;
  first_name: string;
  last_name: string;
  real_email: string;
  phone: string;
  membership_tier: string;
  joined_on: string;
  total_bookings: string;
  last_booking_date: string;
  trackman_emails_linked: string;
}

function parseCSV(content: string): MemberData[] {
  const lines = content.trim().split('\n');
  const headers = lines[0].split(',');
  const members: MemberData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
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
    
    const member: any = {};
    headers.forEach((header, idx) => {
      member[header.trim()] = values[idx] || '';
    });
    
    if (member.real_email) {
      members.push(member as MemberData);
    }
  }
  
  return members;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return null;
}

function parseLinkedEmails(emailsStr: string): string[] {
  if (!emailsStr) return [];
  return emailsStr.split(',').map(e => e.trim()).filter(e => e.length > 0);
}

async function updateDevelopmentDatabase(members: MemberData[]) {
  console.log(`\nUpdating development database with ${members.length} members...`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  const notFoundEmails: string[] = [];
  
  for (const member of members) {
    try {
      const email = member.real_email.toLowerCase().trim();
      const joinDate = parseDate(member.joined_on);
      const linkedEmails = parseLinkedEmails(member.trackman_emails_linked);
      
      const result = await db
        .update(users)
        .set({
          firstName: member.first_name || null,
          lastName: member.last_name || null,
          tier: member.membership_tier || null,
          phone: member.phone || null,
          mindbodyClientId: member.mindbody_id || null,
          lifetimeVisits: parseInt(member.total_bookings, 10) || 0,
          linkedEmails: linkedEmails,
          createdAt: joinDate || undefined,
          updatedAt: new Date(),
        })
        .where(eq(sql`LOWER(${users.email})`, email))
        .returning({ id: users.id });
      
      if (result.length > 0) {
        updated++;
        if (updated % 50 === 0) {
          console.log(`  Updated ${updated} members...`);
        }
      } else {
        notFound++;
        notFoundEmails.push(email);
      }
    } catch (error) {
      errors++;
      console.error(`  Error updating ${member.real_email}:`, error);
    }
  }
  
  console.log(`\nDevelopment database update complete:`);
  console.log(`  - Updated: ${updated}`);
  console.log(`  - Not found: ${notFound}`);
  console.log(`  - Errors: ${errors}`);
  
  if (notFoundEmails.length > 0 && notFoundEmails.length <= 20) {
    console.log(`\nEmails not found in database:`);
    notFoundEmails.forEach(e => console.log(`  - ${e}`));
  } else if (notFoundEmails.length > 20) {
    console.log(`\nFirst 20 emails not found in database:`);
    notFoundEmails.slice(0, 20).forEach(e => console.log(`  - ${e}`));
    console.log(`  ... and ${notFoundEmails.length - 20} more`);
  }
  
  return { updated, notFound, errors, notFoundEmails };
}

function generateProductionSQL(members: MemberData[]): string {
  let sql = `-- Production database update script\n`;
  sql += `-- Generated: ${new Date().toISOString()}\n`;
  sql += `-- Total members: ${members.length}\n\n`;
  sql += `BEGIN;\n\n`;
  
  for (const member of members) {
    const email = member.real_email.toLowerCase().trim().replace(/'/g, "''");
    const firstName = (member.first_name || '').replace(/'/g, "''");
    const lastName = (member.last_name || '').replace(/'/g, "''");
    const tier = (member.membership_tier || '').replace(/'/g, "''");
    const phone = (member.phone || '').replace(/'/g, "''");
    const mindbodyId = (member.mindbody_id || '').replace(/'/g, "''");
    const lifetimeVisits = parseInt(member.total_bookings, 10) || 0;
    const linkedEmails = parseLinkedEmails(member.trackman_emails_linked);
    const linkedEmailsJson = JSON.stringify(linkedEmails).replace(/'/g, "''");
    
    const joinDate = parseDate(member.joined_on);
    const joinDateStr = joinDate ? joinDate.toISOString() : null;
    
    sql += `UPDATE users SET\n`;
    sql += `  first_name = '${firstName}',\n`;
    sql += `  last_name = '${lastName}',\n`;
    sql += `  tier = '${tier}',\n`;
    sql += `  phone = '${phone}',\n`;
    sql += `  mindbody_client_id = '${mindbodyId}',\n`;
    sql += `  lifetime_visits = ${lifetimeVisits},\n`;
    sql += `  linked_emails = '${linkedEmailsJson}'::jsonb,\n`;
    if (joinDateStr) {
      sql += `  created_at = '${joinDateStr}',\n`;
    }
    sql += `  updated_at = NOW()\n`;
    sql += `WHERE LOWER(email) = '${email}';\n\n`;
  }
  
  sql += `COMMIT;\n`;
  return sql;
}

async function main() {
  const csvPath = path.join(__dirname, '..', 'attached_assets', 'even_house_cleaned_member_data_1766216046262.csv');
  
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const members = parseCSV(csvContent);
  console.log(`Parsed ${members.length} members from CSV`);
  
  const result = await updateDevelopmentDatabase(members);
  
  console.log('\nGenerating production SQL script...');
  const productionSQL = generateProductionSQL(members);
  const sqlPath = path.join(__dirname, '..', 'scripts', 'production-member-update.sql');
  fs.writeFileSync(sqlPath, productionSQL);
  console.log(`Production SQL script saved to: ${sqlPath}`);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Development database: ${result.updated} members updated`);
  console.log(`Production SQL script: Ready at scripts/production-member-update.sql`);
  console.log('\nTo update production, run the SQL script in the Database panel.');
  
  process.exit(0);
}

main().catch(console.error);
