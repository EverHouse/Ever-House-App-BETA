import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isStaffOrAdmin } from '../core/middleware';
import { syncWellnessCalendarEvents, discoverCalendarIds, getCalendarIdByName, createCalendarEventOnCalendar, deleteCalendarEvent, updateCalendarEvent, CALENDAR_CONFIG } from '../core/calendar';
import { db } from '../db';
import { wellnessEnrollments, wellnessClasses } from '../../shared/schema';
import { eq, and, gte, sql, isNull, asc } from 'drizzle-orm';

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

router.post('/api/wellness-classes/backfill-calendar', isStaffOrAdmin, async (req, res) => {
  try {
    await discoverCalendarIds();
    const calendarId = await getCalendarIdByName(CALENDAR_CONFIG.wellness.name);
    
    if (!calendarId) {
      return res.status(404).json({ error: 'Wellness calendar not found' });
    }
    
    const classesWithoutCalendar = await db.select().from(wellnessClasses)
      .where(and(
        isNull(wellnessClasses.googleCalendarId),
        gte(wellnessClasses.date, sql`CURRENT_DATE`)
      ))
      .orderBy(asc(wellnessClasses.date));
    
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
    
    let created = 0;
    const errors: string[] = [];
    
    for (const wc of classesWithoutCalendar) {
      try {
        const calendarTitle = `${wc.category} - ${wc.title} with ${wc.instructor}`;
        const calendarDescription = [wc.description, `Duration: ${wc.duration}`, `Spots: ${wc.spots}`].filter(Boolean).join('\n');
        const startTime24 = convertTo24Hour(wc.time);
        const endTime24 = calculateEndTime(startTime24, wc.duration);
        
        const googleCalendarId = await createCalendarEventOnCalendar(
          calendarId,
          calendarTitle,
          calendarDescription,
          wc.date,
          startTime24,
          endTime24
        );
        
        if (googleCalendarId) {
          await db.update(wellnessClasses)
            .set({ googleCalendarId })
            .where(eq(wellnessClasses.id, wc.id));
          created++;
        }
      } catch (err: any) {
        errors.push(`Class ${wc.id}: ${err.message}`);
      }
    }
    
    res.json({
      message: `Created ${created} calendar events for existing wellness classes`,
      created,
      total: classesWithoutCalendar.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    if (!isProduction) console.error('Wellness calendar backfill error:', error);
    res.status(500).json({ error: 'Failed to backfill wellness calendar events' });
  }
});

router.get('/api/wellness-classes', async (req, res) => {
  try {
    const { active_only } = req.query;
    // Join with enrollments to get remaining spots
    let query = `
      SELECT wc.*, 
        COALESCE(e.enrolled_count, 0)::integer as enrolled_count,
        GREATEST(0, CASE 
          WHEN wc.spots ~ '^[0-9]+$' THEN CAST(wc.spots AS INTEGER) - COALESCE(e.enrolled_count, 0)
          WHEN wc.spots ~ '^[0-9]+' THEN CAST(REGEXP_REPLACE(wc.spots, '[^0-9]', '', 'g') AS INTEGER) - COALESCE(e.enrolled_count, 0)
          ELSE NULL
        END)::integer as spots_remaining
      FROM wellness_classes wc
      LEFT JOIN (
        SELECT class_id, COUNT(*)::integer as enrolled_count 
        FROM wellness_enrollments 
        WHERE status = 'confirmed' 
        GROUP BY class_id
      ) e ON wc.id = e.class_id
    `;
    if (active_only === 'true') {
      query += ' WHERE wc.is_active = true AND wc.date >= CURRENT_DATE';
    }
    query += ' ORDER BY wc.date ASC, wc.time ASC';
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

// Wellness enrollments endpoints
router.get('/api/wellness-enrollments', async (req, res) => {
  try {
    const { user_email } = req.query;
    
    if (!user_email) {
      return res.status(400).json({ error: 'User email is required' });
    }
    
    const conditions = [
      eq(wellnessEnrollments.status, 'confirmed'),
      eq(wellnessEnrollments.userEmail, user_email as string),
      gte(wellnessClasses.date, sql`CURRENT_DATE`)
    ];
    
    const result = await db.select({
      id: wellnessEnrollments.id,
      class_id: wellnessEnrollments.classId,
      user_email: wellnessEnrollments.userEmail,
      status: wellnessEnrollments.status,
      created_at: wellnessEnrollments.createdAt,
      title: wellnessClasses.title,
      date: wellnessClasses.date,
      time: wellnessClasses.time,
      instructor: wellnessClasses.instructor,
      duration: wellnessClasses.duration,
      category: wellnessClasses.category,
      spots: wellnessClasses.spots
    })
    .from(wellnessEnrollments)
    .innerJoin(wellnessClasses, eq(wellnessEnrollments.classId, wellnessClasses.id))
    .where(and(...conditions))
    .orderBy(wellnessClasses.date, wellnessClasses.time);
    
    res.json(result);
  } catch (error: any) {
    if (!isProduction) console.error('Wellness enrollments error:', error);
    res.status(500).json({ error: 'Failed to fetch enrollments' });
  }
});

router.post('/api/wellness-enrollments', async (req, res) => {
  try {
    const { class_id, user_email } = req.body;
    
    if (!class_id || !user_email) {
      return res.status(400).json({ error: 'Missing class_id or user_email' });
    }
    
    // Check if already enrolled using Drizzle
    const existing = await db.select({ id: wellnessEnrollments.id })
      .from(wellnessEnrollments)
      .where(and(
        eq(wellnessEnrollments.classId, class_id),
        eq(wellnessEnrollments.userEmail, user_email),
        eq(wellnessEnrollments.status, 'confirmed')
      ));
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Already enrolled in this class' });
    }
    
    const result = await db.insert(wellnessEnrollments)
      .values({
        classId: class_id,
        userEmail: user_email,
        status: 'confirmed'
      })
      .returning();
    
    res.status(201).json(result[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Wellness enrollment error:', error);
    res.status(500).json({ error: 'Failed to enroll in class' });
  }
});

router.delete('/api/wellness-enrollments/:class_id/:user_email', async (req, res) => {
  try {
    const { class_id, user_email } = req.params;
    
    await db.update(wellnessEnrollments)
      .set({ status: 'cancelled' })
      .where(and(
        eq(wellnessEnrollments.classId, parseInt(class_id)),
        eq(wellnessEnrollments.userEmail, user_email)
      ));
    
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Wellness enrollment cancellation error:', error);
    res.status(500).json({ error: 'Failed to cancel enrollment' });
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
