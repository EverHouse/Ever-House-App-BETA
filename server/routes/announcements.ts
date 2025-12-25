import { Router } from 'express';
import { isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { db } from '../db';
import { announcements } from '../../shared/schema';
import { eq, desc, sql, or, and, gte, lte, isNull } from 'drizzle-orm';

const router = Router();

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
    
    const results = await query.orderBy(desc(announcements.createdAt));
    
    const formatted = results.map(a => ({
      id: a.id.toString(),
      title: a.title,
      desc: a.message || '',
      type: (a.priority === 'high' ? 'announcement' : 'update') as 'update' | 'announcement',
      date: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now',
      startDate: a.startsAt ? new Date(a.startsAt).toISOString().split('T')[0] : undefined,
      endDate: a.endsAt ? new Date(a.endsAt).toISOString().split('T')[0] : undefined,
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
    const { title, description, type, startDate, endDate, linkType, linkTarget } = req.body;
    
    if (!isProduction) {
      console.log('[Announcements] Create request body:', { title, type, linkType, linkTarget });
    }
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const userEmail = (req as any).user?.email || 'system';
    
    const [newAnnouncement] = await db.insert(announcements).values({
      title,
      message: description || '',
      priority: type === 'announcement' ? 'high' : 'normal',
      startsAt: startDate ? new Date(startDate) : null,
      endsAt: endDate ? new Date(endDate) : null,
      linkType: linkType || null,
      linkTarget: linkTarget || null,
      createdBy: userEmail
    }).returning();
    
    res.status(201).json({
      id: newAnnouncement.id.toString(),
      title: newAnnouncement.title,
      desc: newAnnouncement.message || '',
      type: (newAnnouncement.priority === 'high' ? 'announcement' : 'update') as 'update' | 'announcement',
      date: 'Just now',
      startDate: newAnnouncement.startsAt ? new Date(newAnnouncement.startsAt).toISOString().split('T')[0] : undefined,
      endDate: newAnnouncement.endsAt ? new Date(newAnnouncement.endsAt).toISOString().split('T')[0] : undefined,
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
    const { title, description, type, startDate, endDate, linkType, linkTarget } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const [updated] = await db.update(announcements)
      .set({
        title,
        message: description || '',
        priority: type === 'announcement' ? 'high' : 'normal',
        startsAt: startDate ? new Date(startDate) : null,
        endsAt: endDate ? new Date(endDate) : null,
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
      type: (updated.priority === 'high' ? 'announcement' : 'update') as 'update' | 'announcement',
      date: updated.createdAt ? new Date(updated.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Just now',
      startDate: updated.startsAt ? new Date(updated.startsAt).toISOString().split('T')[0] : undefined,
      endDate: updated.endsAt ? new Date(updated.endsAt).toISOString().split('T')[0] : undefined,
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
