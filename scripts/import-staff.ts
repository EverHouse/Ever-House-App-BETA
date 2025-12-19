import { pool } from '../server/core/db';
import * as fs from 'fs';
import * as path from 'path';

interface StaffRow {
  lastName: string;
  firstName: string;
  email: string;
  phone: string;
  jobDescription: string;
}

function parseCSV(content: string): StaffRow[] {
  const lines = content.split('\n');
  const rows: StaffRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const matches = line.match(/("([^"]*)")|([^,]+)/g);
    if (!matches || matches.length < 9) continue;
    
    const cleanValue = (val: string) => val.replace(/^"|"$/g, '').trim();
    
    const lastName = cleanValue(matches[2] || '');
    const firstName = cleanValue(matches[3] || '');
    const email = cleanValue(matches[4] || '');
    const phone = cleanValue(matches[5] || '').replace(/[^0-9]/g, '');
    const jobDescription = cleanValue(matches[8] || '');
    
    if (email) {
      rows.push({ lastName, firstName, email, phone, jobDescription });
    }
  }
  
  return rows;
}

async function importStaff() {
  try {
    const csvPath = path.join(process.cwd(), 'attached_assets/staff_data.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    
    const lines = content.split('\n').slice(1);
    let imported = 0;
    let skippedAdmin = 0;
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          parts.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      parts.push(current.trim());
      
      const lastName = parts[2]?.replace(/"/g, '') || '';
      const firstName = parts[3]?.replace(/"/g, '') || '';
      const email = parts[4]?.replace(/"/g, '') || '';
      const phone = parts[5]?.replace(/"/g, '').replace(/[^0-9]/g, '') || null;
      const jobDescription = parts[8]?.replace(/"/g, '') || null;
      
      if (!email) continue;
      
      if (email.toLowerCase() === 'afogel@gmail.com') {
        console.log(`Skipping Adam Fogel (admin): ${email}`);
        skippedAdmin++;
        continue;
      }
      
      if (email.toLowerCase() === 'bar@evenhouse.club') {
        console.log(`Skipping system account: ${email}`);
        continue;
      }
      
      const name = `${firstName} ${lastName}`.trim();
      
      const existing = await pool.query(
        'SELECT id FROM staff_users WHERE email = $1',
        [email]
      );
      
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE staff_users SET 
            name = $1, first_name = $2, last_name = $3, 
            phone = $4, job_title = $5, is_active = true
          WHERE email = $6`,
          [name, firstName, lastName, phone, jobDescription, email]
        );
        console.log(`Updated: ${name} (${email}) - ${jobDescription || 'No title'}`);
      } else {
        await pool.query(
          `INSERT INTO staff_users (email, name, first_name, last_name, phone, job_title, is_active, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, true, 'csv_import')`,
          [email, name, firstName, lastName, phone, jobDescription]
        );
        console.log(`Added: ${name} (${email}) - ${jobDescription || 'No title'}`);
      }
      imported++;
    }
    
    console.log(`\nImport complete: ${imported} staff members processed, ${skippedAdmin} admin skipped`);
    
    const result = await pool.query('SELECT email, name, job_title, phone FROM staff_users WHERE is_active = true ORDER BY name');
    console.log('\nActive staff:');
    result.rows.forEach((s: any) => {
      console.log(`  ${s.name} | ${s.job_title || 'No title'} | ${s.phone || 'No phone'} | ${s.email}`);
    });
    
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

importStaff();
