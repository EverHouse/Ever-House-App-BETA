import { db } from '../db';
import { users, bookingRequests, trackmanUnmatchedBookings, trackmanImportRuns } from '../../shared/schema';
import { eq, or, ilike, sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

interface TrackmanRow {
  bookingId: string;
  userName: string;
  userEmail: string;
  bookedDate: string;
  startDate: string;
  endDate: string;
  durationMins: number;
  status: string;
  bayNumber: string;
  playerCount: number;
  notes: string;
}

const PLACEHOLDER_EMAILS = [
  'anonymous@yourgolfbooking.com',
  'booking@evenhouse.club',
  'bookings@evenhouse.club'
];

function isPlaceholderEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  if (PLACEHOLDER_EMAILS.includes(normalizedEmail)) return true;
  if (normalizedEmail.endsWith('@evenhouse.club') && normalizedEmail.length < 25) {
    const localPart = normalizedEmail.split('@')[0];
    if (/^[a-z]{3,12}$/.test(localPart) && !/\d/.test(localPart)) {
      return true;
    }
  }
  return false;
}

async function loadEmailMapping(): Promise<Map<string, string>> {
  const mappingPath = path.join(process.cwd(), 'attached_assets', 'even_house_cleaned_member_data_1767012619480.csv');
  const mapping = new Map<string, string>();
  
  // Load from CSV file first
  if (fs.existsSync(mappingPath)) {
    try {
      const content = fs.readFileSync(mappingPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        if (fields.length >= 10) {
          const realEmail = fields[3]?.trim().toLowerCase();
          const linkedEmails = fields[9]?.trim();
          
          if (realEmail && linkedEmails) {
            const placeholders = linkedEmails.split(',').map(e => e.trim().toLowerCase());
            for (const placeholder of placeholders) {
              if (placeholder) {
                mapping.set(placeholder, realEmail);
              }
            }
          }
        }
      }
      
      process.stderr.write(`[Trackman Import] Loaded ${mapping.size} email mappings from CSV\n`);
    } catch (err: any) {
      process.stderr.write('[Trackman Import] Error loading CSV mapping: ' + err.message + '\n');
    }
  }
  
  // Also load from database (from manual resolutions)
  try {
    const usersWithMappings = await db.select({
      email: users.email,
      trackmanLinkedEmails: users.trackmanLinkedEmails
    })
    .from(users)
    .where(sql`trackman_linked_emails IS NOT NULL AND jsonb_array_length(trackman_linked_emails) > 0`);
    
    let dbMappingsCount = 0;
    for (const user of usersWithMappings) {
      if (user.email && Array.isArray(user.trackmanLinkedEmails)) {
        for (const placeholder of user.trackmanLinkedEmails) {
          if (typeof placeholder === 'string' && placeholder.trim()) {
            mapping.set(placeholder.toLowerCase().trim(), user.email.toLowerCase());
            dbMappingsCount++;
          }
        }
      }
    }
    
    if (dbMappingsCount > 0) {
      process.stderr.write(`[Trackman Import] Loaded ${dbMappingsCount} email mappings from database\n`);
    }
  } catch (err: any) {
    process.stderr.write('[Trackman Import] Error loading DB mappings: ' + err.message + '\n');
  }
  
  process.stderr.write(`[Trackman Import] Total email mappings: ${mapping.size}\n`);
  return mapping;
}

function normalizeStatus(status: string): string | null {
  const s = status.toLowerCase().trim();
  if (s === 'attended') return 'attended';
  if (s === 'confirmed') return 'attended';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'no_show' || s === 'noshow') return 'no_show';
  return null;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function extractTime(dateTimeStr: string): string {
  if (!dateTimeStr) return '00:00';
  const parts = dateTimeStr.split(' ');
  if (parts.length >= 2) {
    return parts[1] + ':00';
  }
  return '00:00:00';
}

function extractDate(dateTimeStr: string): string {
  if (!dateTimeStr) return new Date().toISOString().split('T')[0];
  const parts = dateTimeStr.split(' ');
  return parts[0];
}

export async function importTrackmanBookings(csvPath: string, importedBy?: string): Promise<{
  totalRows: number;
  matchedRows: number;
  unmatchedRows: number;
  skippedRows: number;
  errors: string[];
}> {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    return { totalRows: 0, matchedRows: 0, unmatchedRows: 0, skippedRows: 0, errors: ['Empty or invalid CSV'] };
  }

  const allMembers = await db.select({
    email: users.email,
    firstName: users.firstName,
    lastName: users.lastName
  }).from(users);

  const membersByName = new Map<string, string>();
  const membersByEmail = new Map<string, string>();
  
  for (const member of allMembers) {
    if (member.email) {
      membersByEmail.set(member.email.toLowerCase(), member.email);
      const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase().trim();
      if (fullName) {
        membersByName.set(fullName, member.email);
      }
      if (member.firstName) {
        membersByName.set(member.firstName.toLowerCase(), member.email);
      }
    }
  }

  const emailMapping = await loadEmailMapping();
  process.stderr.write(`[Trackman Import] Email mapping loaded with ${emailMapping.size} entries, membersByEmail has ${membersByEmail.size} entries\n`);

  let matchedRows = 0;
  let unmatchedRows = 0;
  let skippedRows = 0;
  const errors: string[] = [];
  let mappingMatchCount = 0;
  let mappingFoundButNotInDb = 0;

  for (let i = 1; i < lines.length; i++) {
    try {
      const fields = parseCSVLine(lines[i]);
      if (fields.length < 12) {
        skippedRows++;
        continue;
      }

      const row: TrackmanRow = {
        bookingId: fields[0],
        userName: fields[5],
        userEmail: fields[6],
        bookedDate: fields[7],
        startDate: fields[8],
        endDate: fields[9],
        durationMins: parseInt(fields[10]) || 60,
        status: fields[11],
        bayNumber: fields[20] || '',
        playerCount: parseInt(fields[14]) || 1,
        notes: fields[16] || ''
      };

      if (row.status.toLowerCase() === 'cancelled') {
        skippedRows++;
        continue;
      }

      let matchedEmail: string | null = null;
      let matchReason = '';

      const mappedEmail = emailMapping.get(row.userEmail.toLowerCase().trim());
      if (mappedEmail) {
        const existingMember = membersByEmail.get(mappedEmail.toLowerCase());
        if (existingMember) {
          matchedEmail = existingMember;
          matchReason = 'Matched via email mapping';
          mappingMatchCount++;
          if (mappingMatchCount <= 3) {
            process.stderr.write(`[Trackman Import] Match: ${row.userEmail} -> ${mappedEmail} -> ${existingMember}\n`);
          }
        } else {
          mappingFoundButNotInDb++;
          if (mappingFoundButNotInDb <= 3) {
            process.stderr.write(`[Trackman Import] Mapped ${row.userEmail} -> ${mappedEmail} but NOT in membersByEmail\n`);
          }
        }
      }

      if (!matchedEmail && !isPlaceholderEmail(row.userEmail) && row.userEmail.includes('@')) {
        const existingMember = membersByEmail.get(row.userEmail.toLowerCase());
        if (existingMember) {
          matchedEmail = existingMember;
          matchReason = 'Matched by email';
        }
      }

      if (!matchedEmail && row.userName) {
        const normalizedName = row.userName.toLowerCase().trim();
        const byName = membersByName.get(normalizedName);
        if (byName) {
          matchedEmail = byName;
          matchReason = 'Matched by name';
        } else {
          const nameParts = normalizedName.split(' ');
          if (nameParts.length >= 2) {
            const firstName = nameParts[0];
            const lastName = nameParts[nameParts.length - 1];
            
            for (const [name, email] of membersByName.entries()) {
              if (name.includes(firstName) && name.includes(lastName)) {
                matchedEmail = email;
                matchReason = `Matched by partial name: ${name}`;
                break;
              }
            }
          }
        }
      }

      const bookingDate = extractDate(row.startDate);
      const startTime = extractTime(row.startDate);
      const endTime = extractTime(row.endDate);
      const normalizedStatus = normalizeStatus(row.status);

      if (!normalizedStatus) {
        skippedRows++;
        errors.push(`Row ${i}: Unknown status "${row.status}"`);
        continue;
      }

      const existingUnmatched = await db.select({ id: trackmanUnmatchedBookings.id })
        .from(trackmanUnmatchedBookings)
        .where(eq(trackmanUnmatchedBookings.trackmanBookingId, row.bookingId))
        .limit(1);
      
      if (existingUnmatched.length > 0) {
        skippedRows++;
        continue;
      }

      const existingBooking = await db.select({ id: bookingRequests.id })
        .from(bookingRequests)
        .where(sql`notes LIKE ${'%[Trackman Import ID:' + row.bookingId + ']%'}`)
        .limit(1);
      
      if (existingBooking.length > 0) {
        skippedRows++;
        continue;
      }

      if (matchedEmail) {
        try {
          await db.insert(bookingRequests).values({
            userEmail: matchedEmail,
            userName: row.userName,
            bayId: parseInt(row.bayNumber) || null,
            requestDate: bookingDate,
            startTime: startTime,
            durationMinutes: row.durationMins,
            endTime: endTime,
            notes: `[Trackman Import ID:${row.bookingId}] ${row.notes}`,
            status: normalizedStatus,
            createdAt: new Date(row.bookedDate.replace(' ', 'T') + ':00')
          });

          if (normalizedStatus === 'attended') {
            await db.execute(sql`
              UPDATE users 
              SET lifetime_visits = COALESCE(lifetime_visits, 0) + 1 
              WHERE email = ${matchedEmail}
            `);
          }

          matchedRows++;
        } catch (insertErr: any) {
          const errDetails = insertErr.cause?.message || insertErr.detail || insertErr.code || 'no details';
          process.stderr.write(`[Trackman Import] Insert error for ${row.bookingId}: ${insertErr.message} | Details: ${errDetails}\n`);
          throw insertErr;
        }
      } else {
        await db.insert(trackmanUnmatchedBookings).values({
          trackmanBookingId: row.bookingId,
          userName: row.userName,
          originalEmail: row.userEmail,
          bookingDate: bookingDate,
          startTime: startTime,
          endTime: endTime,
          durationMinutes: row.durationMins,
          status: normalizedStatus,
          bayNumber: row.bayNumber,
          playerCount: row.playerCount,
          notes: row.notes,
          matchAttemptReason: isPlaceholderEmail(row.userEmail) 
            ? 'Placeholder email, name not found in members' 
            : 'Email not found in members database'
        });

        unmatchedRows++;
      }
    } catch (err: any) {
      errors.push(`Row ${i}: ${err.message}`);
      skippedRows++;
    }
  }

  process.stderr.write(`[Trackman Import] Summary: mappingMatchCount=${mappingMatchCount}, mappingFoundButNotInDb=${mappingFoundButNotInDb}, matchedRows=${matchedRows}, unmatchedRows=${unmatchedRows}, skipped=${skippedRows}\n`);

  await db.insert(trackmanImportRuns).values({
    filename: path.basename(csvPath),
    totalRows: lines.length - 1,
    matchedRows,
    unmatchedRows,
    skippedRows,
    importedBy
  });

  return {
    totalRows: lines.length - 1,
    matchedRows,
    unmatchedRows,
    skippedRows,
    errors
  };
}

export async function getUnmatchedBookings(options?: { 
  resolved?: boolean; 
  limit?: number; 
  offset?: number;
}) {
  if (options?.resolved === false) {
    return await db.select()
      .from(trackmanUnmatchedBookings)
      .where(sql`resolved_email IS NULL`)
      .orderBy(sql`booking_date DESC`)
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  } else if (options?.resolved === true) {
    return await db.select()
      .from(trackmanUnmatchedBookings)
      .where(sql`resolved_email IS NOT NULL`)
      .orderBy(sql`booking_date DESC`)
      .limit(options?.limit || 100)
      .offset(options?.offset || 0);
  }

  return await db.select()
    .from(trackmanUnmatchedBookings)
    .orderBy(sql`booking_date DESC`)
    .limit(options?.limit || 100)
    .offset(options?.offset || 0);
}

export async function resolveUnmatchedBooking(
  unmatchedId: number, 
  memberEmail: string, 
  resolvedBy: string
): Promise<boolean> {
  const unmatched = await db.select()
    .from(trackmanUnmatchedBookings)
    .where(eq(trackmanUnmatchedBookings.id, unmatchedId));

  if (unmatched.length === 0) return false;

  const booking = unmatched[0];

  await db.insert(bookingRequests).values({
    userEmail: memberEmail,
    userName: booking.userName,
    bayId: parseInt(booking.bayNumber || '') || null,
    requestDate: booking.bookingDate,
    startTime: booking.startTime,
    durationMinutes: booking.durationMinutes || 60,
    endTime: booking.endTime,
    notes: `[Trackman Import ID:${booking.trackmanBookingId}] ${booking.notes || ''}`,
    status: booking.status || 'attended',
    createdAt: booking.createdAt
  });

  if (booking.status === 'attended') {
    await db.execute(sql`
      UPDATE users 
      SET lifetime_visits = COALESCE(lifetime_visits, 0) + 1 
      WHERE email = ${memberEmail}
    `);
  }

  // Save the placeholder email mapping to the member's trackman_linked_emails for future imports
  const originalEmail = booking.originalEmail?.toLowerCase().trim();
  if (originalEmail && isPlaceholderEmail(originalEmail)) {
    // Add the email only if it's not already in the array
    const emailAsJsonb = JSON.stringify(originalEmail);
    await db.execute(sql`
      UPDATE users 
      SET trackman_linked_emails = 
        CASE 
          WHEN COALESCE(trackman_linked_emails, '[]'::jsonb) ? ${originalEmail}
          THEN trackman_linked_emails
          ELSE COALESCE(trackman_linked_emails, '[]'::jsonb) || ${emailAsJsonb}::jsonb
        END
      WHERE email = ${memberEmail}
    `);
    process.stderr.write(`[Trackman Resolve] Saved email mapping: ${originalEmail} -> ${memberEmail}\n`);
  }

  await db.update(trackmanUnmatchedBookings)
    .set({
      resolvedEmail: memberEmail,
      resolvedAt: new Date(),
      resolvedBy: resolvedBy
    })
    .where(eq(trackmanUnmatchedBookings.id, unmatchedId));

  return true;
}

export async function getImportRuns() {
  return await db.select()
    .from(trackmanImportRuns)
    .orderBy(sql`created_at DESC`);
}
