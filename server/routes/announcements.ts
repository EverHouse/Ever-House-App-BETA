import { Router } from 'express';
import { isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { db } from '../db';
import { announcements } from '../../shared/schema';
import { eq, desc, sql, or, and, gte, lte, isNull, asc } from 'drizzle-orm';
import { formatDatePacific, createPacificDate, CLUB_TIMEZONE } from '../utils/dateUtils';

const router = Router();

const PRIORITY_ORDER = sql`CASE 
  WHEN ${announcements.priority} = 'urgent' THEN 1 
  WHEN ${announcements.priority} = 'high' THEN 2 
  ELSE 3 
END`;

router.get('/api/announcements', async (req, res) => {
  try {
    const { active_only } = req.query;
    const now = new Date();
    
    let query = db.select().from(announcements);
    
    if (active_only === 'true') {
      query = query.where(
        and(
          eq(announcements.isActive, true),
          or(
            isNull(announcements.startsAt),
            lte(announcements.startsAt, now)
          ),
          or(
            isNull(announcements.endsAt),
            gte(announcements.endsAt, now)
          )
        )
      ) as typeof query;
    }
    
    const results = await query.orderBy(asc(PRIORITY_ORDER), desc(announcements.createdAt));
    
    const formatted = results.map(a => ({
      id: a.id.toString(),
      title: a.title,
      desc: a.message || '',
      type: 'announcement' as const,
      priority: (a.priority || 'normal') as 'normal' | 'high' | 'urgent',
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: CLUB_TIMEZONE }) : 'Just now',
      createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
      startDate: a.startsAt ? formatDatePacific(new Date(a.startsAt)) : undefined,
      endDate: a.endsAt ? formatDatePacific(new Date(a.endsAt)) : undefined,
      linkType: a.linkType || undefined,
      linkTarget: a.linkTarget || undefined
    }));
    
    res.json(formatted);
  } catch (error: any) {
    if (!isProduction) console.error('Announcements fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

router.post('/api/announcements', isStaffOrAdmin, async (req, res) => {
  try {
    const { title, description, type, priority, startDate, endDate, linkType, linkTarget } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const userEmail = (req as any).user?.email || 'system';
    const finalPriority = priority || 'normal';
    
    const [newAnnouncement] = await db.insert(announcements).values({
      title,
      message: description || '',
      priority: finalPriority,
      startsAt: startDate ? createPacificDate(startDate, '00:00:00') : null,
      endsAt: endDate ? createPacificDate(endDate, '23:59:59') : null,
      linkType: linkType || null,
      linkTarget: linkTarget || null,
      createdBy: userEmail
    }).returning();
    
    res.status(201).json({
      id: newAnnouncement.id.toString(),
      title: newAnnouncement.title,
      desc: newAnnouncement.message || '',
      type: 'announcement' as const,
      priority: (newAnnouncement.priority || 'normal') as 'normal' | 'high' | 'urgent',
      date: 'Just now',
      createdAt: newAnnouncement.createdAt ? new Date(newAnnouncement.createdAt).toISOString() : new Date().toISOString(),
      startDate: newAnnouncement.startsAt ? formatDatePacific(new Date(newAnnouncement.startsAt)) : undefined,
      endDate: newAnnouncement.endsAt ? formatDatePacific(new Date(newAnnouncement.endsAt)) : undefined,
      linkType: newAnnouncement.linkType || undefined,
      linkTarget: newAnnouncement.linkTarget || undefined
    });
  } catch (error: any) {
    if (!isProduction) console.error('Announcement create error:', error);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

router.put('/api/announcements/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, priority, startDate, endDate, linkType, linkTarget } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const finalPriority = priority || 'normal';
    
    const [updated] = await db.update(announcements)
      .set({
        title,
        message: description || '',
        priority: finalPriority,
        startsAt: startDate ? createPacificDate(startDate, '00:00:00') : null,
        endsAt: endDate ? createPacificDate(endDate, '23:59:59') : null,
        linkType: linkType || null,
        linkTarget: linkTarget || null
      })
      .where(eq(announcements.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json({
      id: updated.id.toString(),
      title: updated.title,
      desc: updated.message || '',
      type: 'announcement' as const,
      priority: (updated.priority || 'normal') as 'normal' | 'high' | 'urgent',
      date: updated.createdAt ? new Date(updated.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: CLUB_TIMEZONE }) : 'Just now',
      createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
      startDate: updated.startsAt ? formatDatePacific(new Date(updated.startsAt)) : undefined,
      endDate: updated.endsAt ? formatDatePacific(new Date(updated.endsAt)) : undefined,
      linkType: updated.linkType || undefined,
      linkTarget: updated.linkTarget || undefined
    });
  } catch (error: any) {
    if (!isProduction) console.error('Announcement update error:', error);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

router.delete('/api/announcements/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [deleted] = await db.delete(announcements)
      .where(eq(announcements.id, parseInt(id)))
      .returning();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    res.json({ success: true, id });
  } catch (error: any) {
    if (!isProduction) console.error('Announcement delete error:', error);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

export default router;
