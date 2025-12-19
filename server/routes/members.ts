import { Router } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { db } from '../db';
import { users, bookings } from '../../shared/schema';
import { isProduction } from '../core/db';

const router = Router();

router.get('/api/members/:email/details', async (req, res) => {
  try {
    const { email } = req.params;
    const normalizedEmail = decodeURIComponent(email).toLowerCase();
    
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      tier: users.tier,
      tags: users.tags,
      role: users.role,
      phone: users.phone,
      mindbodyClientId: users.mindbodyClientId,
      lifetimeVisits: users.lifetimeVisits
    })
      .from(users)
      .where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
    
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const user = userResult[0];
    
    const lastBookingResult = await db.select({ bookingDate: bookings.bookingDate })
      .from(bookings)
      .where(sql`LOWER(${bookings.userEmail}) = ${normalizedEmail}`)
      .orderBy(desc(bookings.bookingDate))
      .limit(1);
    
    const lastBookingDate = lastBookingResult[0]?.bookingDate || null;
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      tier: user.tier,
      tags: user.tags || [],
      role: user.role,
      phone: user.phone,
      mindbodyClientId: user.mindbodyClientId,
      lifetimeVisits: user.lifetimeVisits || 0,
      lastBookingDate
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch member details' });
  }
});

router.put('/api/members/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, tags } = req.body;
    
    if (role && !['member', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    if (!role && tags === undefined) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (role) updateData.role = role;
    if (tags !== undefined) updateData.tags = tags;
    
    const result = await db.update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    
    if (result.length === 0) {
      const insertResult = await db.insert(users)
        .values({
          id,
          role: role || 'member',
          tags: tags || []
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            role: role || sql`${users.role}`,
            tags: tags !== undefined ? tags : sql`${users.tags}`,
            updatedAt: new Date()
          }
        })
        .returning();
      return res.json(insertResult[0]);
    }
    
    res.json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

export default router;
