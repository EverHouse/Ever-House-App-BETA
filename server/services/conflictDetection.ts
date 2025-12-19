import { db } from '../db';
import { users, membershipTierConflicts } from '../../shared/schema';
import { eq, and, or, sql } from 'drizzle-orm';

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

      const userResults = await db
        .select({
          id: users.id,
          email: users.email,
          tier: users.tier,
          mindbodyClientId: users.mindbodyClientId,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(users)
        .where(
          or(
            eq(sql`LOWER(${users.email})`, email),
            eq(users.mindbodyClientId, member.mindbodyId || null)
          )
        );

      if (userResults.length === 0) {
        result.skipped++;
        continue;
      }

      const user = userResults[0];
      const currentTier = user.tier || 'Guest';
      const incomingTier = member.tier || 'Guest';

      if (currentTier.toLowerCase() !== incomingTier.toLowerCase()) {
        const existingConflicts = await db
          .select({ id: membershipTierConflicts.id })
          .from(membershipTierConflicts)
          .where(
            and(
              eq(membershipTierConflicts.email, email),
              eq(membershipTierConflicts.status, 'open'),
              eq(membershipTierConflicts.source, source)
            )
          );

        if (existingConflicts.length > 0) {
          await db
            .update(membershipTierConflicts)
            .set({
              incomingTier: incomingTier,
              currentTier: currentTier,
              updatedAt: new Date(),
              metadata: { firstName: member.firstName, lastName: member.lastName },
            })
            .where(eq(membershipTierConflicts.id, existingConflicts[0].id));
        } else {
          await db.insert(membershipTierConflicts).values({
            userId: user.id,
            email: email,
            mindbodyId: member.mindbodyId || user.mindbodyClientId,
            currentTier: currentTier,
            incomingTier: incomingTier,
            source: source,
            status: 'open',
            metadata: {
              firstName: member.firstName || user.firstName,
              lastName: member.lastName || user.lastName,
            },
          });
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
  const results = await db
    .select({
      id: membershipTierConflicts.id,
      userId: membershipTierConflicts.userId,
      email: membershipTierConflicts.email,
      mindbodyId: membershipTierConflicts.mindbodyId,
      currentTier: membershipTierConflicts.currentTier,
      incomingTier: membershipTierConflicts.incomingTier,
      source: membershipTierConflicts.source,
      status: membershipTierConflicts.status,
      resolvedBy: membershipTierConflicts.resolvedBy,
      resolvedAt: membershipTierConflicts.resolvedAt,
      metadata: membershipTierConflicts.metadata,
      createdAt: membershipTierConflicts.createdAt,
      updatedAt: membershipTierConflicts.updatedAt,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(membershipTierConflicts)
    .leftJoin(users, eq(membershipTierConflicts.userId, users.id))
    .where(eq(membershipTierConflicts.status, 'open'))
    .orderBy(sql`${membershipTierConflicts.createdAt} DESC`);

  return results;
}

export async function acceptConflict(conflictId: number, resolvedBy: string) {
  return await db.transaction(async (tx) => {
    const conflictResults = await tx
      .select()
      .from(membershipTierConflicts)
      .where(
        and(
          eq(membershipTierConflicts.id, conflictId),
          eq(membershipTierConflicts.status, 'open')
        )
      );

    if (conflictResults.length === 0) {
      throw new Error('Conflict not found or already resolved');
    }

    const conflict = conflictResults[0];

    const updateResults = await tx
      .update(users)
      .set({
        tier: conflict.incomingTier,
        updatedAt: new Date(),
      })
      .where(eq(users.id, conflict.userId!))
      .returning({ id: users.id });

    if (updateResults.length === 0) {
      throw new Error('User not found - cannot update tier');
    }

    await tx
      .update(membershipTierConflicts)
      .set({
        status: 'accepted',
        resolvedBy: resolvedBy,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(membershipTierConflicts.id, conflictId));

    return { success: true, newTier: conflict.incomingTier };
  });
}

export async function ignoreConflict(conflictId: number, resolvedBy: string) {
  const results = await db
    .update(membershipTierConflicts)
    .set({
      status: 'ignored',
      resolvedBy: resolvedBy,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(membershipTierConflicts.id, conflictId),
        eq(membershipTierConflicts.status, 'open')
      )
    )
    .returning();

  if (results.length === 0) {
    throw new Error('Conflict not found or already resolved');
  }

  return { success: true };
}
