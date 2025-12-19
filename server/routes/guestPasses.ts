import { Router } from 'express';
import { eq, sql, and, lt } from 'drizzle-orm';
import { db } from '../db';
import { guestPasses } from '../../shared/schema';
import { isProduction } from '../core/db';

const router = Router();

const TIER_GUEST_PASSES: Record<string, number> = {
  'Social': 2,
  'Core': 4,
  'Premium': 8,
  'Corporate': 15
};

router.get('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { tier } = req.query;
    const passesTotal = TIER_GUEST_PASSES[tier as string] || 4;
    
    let result = await db.select()
      .from(guestPasses)
      .where(eq(guestPasses.memberEmail, email));
    
    if (result.length === 0) {
      await db.insert(guestPasses)
        .values({
          memberEmail: email,
          passesUsed: 0,
          passesTotal: passesTotal
        });
      result = await db.select()
        .from(guestPasses)
        .where(eq(guestPasses.memberEmail, email));
    } else if (result[0].passesTotal !== passesTotal) {
      await db.update(guestPasses)
        .set({ passesTotal: passesTotal })
        .where(eq(guestPasses.memberEmail, email));
      result[0].passesTotal = passesTotal;
    }
    
    const data = result[0];
    res.json({
      passes_used: data.passesUsed,
      passes_total: data.passesTotal,
      passes_remaining: data.passesTotal - data.passesUsed
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/guest-passes/:email/use', async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await db.update(guestPasses)
      .set({ passesUsed: sql`${guestPasses.passesUsed} + 1` })
      .where(and(
        eq(guestPasses.memberEmail, email),
        lt(guestPasses.passesUsed, guestPasses.passesTotal)
      ))
      .returning();
    
    if (result.length === 0) {
      return res.status(400).json({ error: 'No guest passes remaining' });
    }
    
    const data = result[0];
    res.json({
      passes_used: data.passesUsed,
      passes_total: data.passesTotal,
      passes_remaining: data.passesTotal - data.passesUsed
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.put('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { passes_total } = req.body;
    
    const result = await db.update(guestPasses)
      .set({ passesTotal: passes_total })
      .where(eq(guestPasses.memberEmail, email))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const data = result[0];
    res.json({
      passes_used: data.passesUsed,
      passes_total: data.passesTotal,
      passes_remaining: data.passesTotal - data.passesUsed
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
