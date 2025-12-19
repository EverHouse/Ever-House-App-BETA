import { pool } from '../core/db';

interface MemberData {
  email: string;
  mindbodyId?: string;
  tier: string;
  firstName?: string;
  lastName?: string;
}

interface ConflictResult {
  detected: number;
  skipped: number;
  errors: string[];
}

export async function detectTierConflicts(
  members: MemberData[],
  source: string
): Promise<ConflictResult> {
  const result: ConflictResult = { detected: 0, skipped: 0, errors: [] };

  for (const member of members) {
    try {
      const email = member.email?.toLowerCase().trim();
      if (!email) {
        result.skipped++;
        continue;
      }

      const userResult = await pool.query(
        `SELECT id, email, tier, mindbody_client_id, first_name, last_name 
         FROM users 
         WHERE LOWER(email) = $1 OR mindbody_client_id = $2`,
        [email, member.mindbodyId || null]
      );

      if (userResult.rows.length === 0) {
        result.skipped++;
        continue;
      }

      const user = userResult.rows[0];
      const currentTier = user.tier || 'Guest';
      const incomingTier = member.tier || 'Guest';

      if (currentTier.toLowerCase() !== incomingTier.toLowerCase()) {
        const existingConflict = await pool.query(
          `SELECT id FROM membership_tier_conflicts 
           WHERE email = $1 AND status = 'open' AND source = $2`,
          [email, source]
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
              JSON.stringify({ firstName: member.firstName, lastName: member.lastName }),
              existingConflict.rows[0].id
            ]
          );
        } else {
          await pool.query(
            `INSERT INTO membership_tier_conflicts 
             (user_id, email, mindbody_id, current_tier, incoming_tier, source, status, metadata)
             VALUES ($1, $2, $3, $4, $5, $6, 'open', $7::jsonb)`,
            [
              user.id,
              email,
              member.mindbodyId || user.mindbody_client_id,
              currentTier,
              incomingTier,
              source,
              JSON.stringify({ 
                firstName: member.firstName || user.first_name, 
                lastName: member.lastName || user.last_name 
              })
            ]
          );
        }
        result.detected++;
      }
    } catch (error: any) {
      result.errors.push(`Error processing ${member.email}: ${error.message}`);
    }
  }

  return result;
}

export async function getOpenConflicts() {
  const result = await pool.query(
    `SELECT c.*, u.first_name, u.last_name
     FROM membership_tier_conflicts c
     LEFT JOIN users u ON c.user_id = u.id
     WHERE c.status = 'open'
     ORDER BY c.created_at DESC`
  );
  return result.rows;
}

export async function acceptConflict(conflictId: number, resolvedBy: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const conflictResult = await client.query(
      'SELECT * FROM membership_tier_conflicts WHERE id = $1 AND status = $2',
      [conflictId, 'open']
    );

    if (conflictResult.rows.length === 0) {
      throw new Error('Conflict not found or already resolved');
    }

    const conflict = conflictResult.rows[0];

    const updateResult = await client.query(
      `UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
      [conflict.incoming_tier, conflict.user_id]
    );

    if (updateResult.rows.length === 0) {
      throw new Error('User not found - cannot update tier');
    }

    await client.query(
      `UPDATE membership_tier_conflicts 
       SET status = 'accepted', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [resolvedBy, conflictId]
    );

    await client.query('COMMIT');
    return { success: true, newTier: conflict.incoming_tier };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function ignoreConflict(conflictId: number, resolvedBy: string) {
  const result = await pool.query(
    `UPDATE membership_tier_conflicts 
     SET status = 'ignored', resolved_by = $1, resolved_at = NOW(), updated_at = NOW()
     WHERE id = $2 AND status = 'open'
     RETURNING *`,
    [resolvedBy, conflictId]
  );

  if (result.rows.length === 0) {
    throw new Error('Conflict not found or already resolved');
  }

  return { success: true };
}
