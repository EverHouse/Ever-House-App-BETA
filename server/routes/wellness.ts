import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { syncWellnessCalendarEvents, discoverCalendarIds, getCalendarIdByName, createCalendarEventOnCalendar, deleteCalendarEvent, updateCalendarEvent, CALENDAR_CONFIG } from '../core/calendar';

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
    
    let googleCalendarId: string | null = null;
    try {
      const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
      if (calendarId) {
        const calendarTitle = `${category} - ${title} with ${instructor}`;
        const calendarDescription = [description, `Duration: ${duration}`, `Spots: ${spots}`].filter(Boolean).join('\n');
        
        const convertTo24Hour = (timeStr: string): string => {
          const match12h = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
          if (match12h) {
            let hours = parseInt(match12h[1]);
            const minutes = match12h[2];
            const period = match12h[3].toUpperCase();
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
            return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
          }
          const match24h = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
          if (match24h) {
            const hours = match24h[1].padStart(2, '0');
            const minutes = match24h[2];
            const seconds = match24h[3] || '00';
            return `${hours}:${minutes}:${seconds}`;
          }
          return '09:00:00';
        };
        
        const calculateEndTime = (startTime24: string, durationStr: string): string => {
          const durationMatch = durationStr.match(/(\d+)/);
          const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
          const [hours, minutes] = startTime24.split(':').map(Number);
          const totalMinutes = hours * 60 + minutes + durationMinutes;
          const endHours = Math.floor(totalMinutes / 60) % 24;
          const endMins = totalMinutes % 60;
          return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
        };
        
        const startTime24 = convertTo24Hour(time);
        const endTime24 = calculateEndTime(startTime24, duration);
        
        googleCalendarId = await createCalendarEventOnCalendar(
          calendarId,
          calendarTitle,
          calendarDescription,
          date,
          startTime24,
          endTime24
        );
      }
    } catch (calError) {
      if (!isProduction) console.error('Failed to create Google Calendar event for wellness class:', calError);
    }
    
    const result = await pool.query(
      `INSERT INTO wellness_classes (title, time, instructor, duration, category, spots, status, description, date, google_calendar_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [title, time, instructor, duration, category, spots, status || 'available', description || null, date, googleCalendarId]
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
    
    const existing = await pool.query('SELECT google_calendar_id, title, time, instructor, duration, category, date FROM wellness_classes WHERE id = $1', [id]);
    
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
    
    if (existing.rows.length > 0 && existing.rows[0].google_calendar_id) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
        if (calendarId) {
          const updated = result.rows[0];
          const calendarTitle = `${updated.category} - ${updated.title} with ${updated.instructor}`;
          const calendarDescription = [updated.description, `Duration: ${updated.duration}`, `Spots: ${updated.spots}`].filter(Boolean).join('\n');
          
          const convertTo24Hour = (timeStr: string): string => {
            const match12h = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
            if (match12h) {
              let hours = parseInt(match12h[1]);
              const minutes = match12h[2];
              const period = match12h[3].toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
            }
            const match24h = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
            if (match24h) {
              const hours = match24h[1].padStart(2, '0');
              const minutes = match24h[2];
              const seconds = match24h[3] || '00';
              return `${hours}:${minutes}:${seconds}`;
            }
            return '09:00:00';
          };
          
          const calculateEndTime = (startTime24: string, durationStr: string): string => {
            const durationMatch = durationStr.match(/(\d+)/);
            const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;
            const [hours, minutes] = startTime24.split(':').map(Number);
            const totalMinutes = hours * 60 + minutes + durationMinutes;
            const endHours = Math.floor(totalMinutes / 60) % 24;
            const endMins = totalMinutes % 60;
            return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
          };
          
          const startTime24 = convertTo24Hour(updated.time);
          const endTime24 = calculateEndTime(startTime24, updated.duration);
          
          await updateCalendarEvent(
            existing.rows[0].google_calendar_id,
            calendarId,
            calendarTitle,
            calendarDescription,
            updated.date,
            startTime24,
            endTime24
          );
        }
      } catch (calError) {
        if (!isProduction) console.error('Failed to update Google Calendar event for wellness class:', calError);
      }
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
    
    const existing = await pool.query('SELECT google_calendar_id FROM wellness_classes WHERE id = $1', [id]);
    if (existing.rows.length > 0 && existing.rows[0].google_calendar_id) {
      try {
        const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
        if (calendarId) {
          await deleteCalendarEvent(existing.rows[0].google_calendar_id, calendarId);
        }
      } catch (calError) {
        if (!isProduction) console.error('Failed to delete Google Calendar event for wellness class:', calError);
      }
    }
    
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
