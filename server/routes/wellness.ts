import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { syncWellnessCalendarEvents, discoverCalendarIds } from '../core/calendar';

const router = Router();

router.post('/api/wellness-classes/sync', async (req, res) => {
  try {
    await discoverCalendarIds();
    const result = await syncWellnessCalendarEvents();
    
    if (result.error) {
      return res.status(404).json({ error: result.error });
    }
    
    res.json({
      message: `Synced ${result.synced} wellness classes from Google Calendar`,
      created: result.created,
      updated: result.updated,
      total: result.synced
    });
  } catch (error: any) {
    if (!isProduction) console.error('Wellness calendar sync error:', error);
    res.status(500).json({ error: 'Failed to sync wellness calendar events' });
  }
});

router.get('/api/wellness-classes', async (req, res) => {
  try {
    const { active_only } = req.query;
    let query = 'SELECT * FROM wellness_classes';
    if (active_only === 'true') {
      query += ' WHERE is_active = true AND date >= CURRENT_DATE';
    }
    query += ' ORDER BY date ASC, time ASC';
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch wellness classes' });
  }
});

router.post('/api/wellness-classes', isStaffOrAdmin, async (req, res) => {
  try {
    const { title, time, instructor, duration, category, spots, status, description, date } = req.body;
    
    if (!title || !time || !instructor || !duration || !category || !spots || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO wellness_classes (title, time, instructor, duration, category, spots, status, description, date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [title, time, instructor, duration, category, spots, status || 'available', description || null, date]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to create wellness class' });
  }
});

router.put('/api/wellness-classes/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, time, instructor, duration, category, spots, status, description, date, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE wellness_classes SET 
        title = COALESCE($1, title),
        time = COALESCE($2, time),
        instructor = COALESCE($3, instructor),
        duration = COALESCE($4, duration),
        category = COALESCE($5, category),
        spots = COALESCE($6, spots),
        status = COALESCE($7, status),
        description = COALESCE($8, description),
        date = COALESCE($9, date),
        is_active = COALESCE($10, is_active),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [title, time, instructor, duration, category, spots, status, description, date, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wellness class not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update wellness class' });
  }
});

router.delete('/api/wellness-classes/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM wellness_classes WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wellness class not found' });
    }
    
    res.json({ message: 'Wellness class deleted', class: result.rows[0] });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to delete wellness class' });
  }
});

export default router;
