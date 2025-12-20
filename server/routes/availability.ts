import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

router.get('/api/availability', async (req, res) => {
  try {
    const { resource_id, date, duration } = req.query;
    
    if (!resource_id || !date) {
      return res.status(400).json({ error: 'resource_id and date are required' });
    }
    
    const durationMinutes = parseInt(duration as string) || 60;
    // Slot increment matches duration: 30, 60, or 90 minutes
    const slotIncrement = durationMinutes;
    
    const bookedSlots = await pool.query(
      `SELECT start_time, end_time FROM booking_requests 
       WHERE bay_id = $1 AND request_date = $2 AND status = 'approved'`,
      [resource_id, date]
    );
    
    const blockedSlots = await pool.query(
      `SELECT start_time, end_time FROM availability_blocks 
       WHERE bay_id = $1 AND block_date = $2`,
      [resource_id, date]
    );
    
    const slots = [];
    const openMinutes = 8 * 60; // 8:00 AM
    const closeMinutes = 22 * 60; // 10:00 PM
    
    for (let startMins = openMinutes; startMins + durationMinutes <= closeMinutes; startMins += slotIncrement) {
      const startHour = Math.floor(startMins / 60);
      const startMin = startMins % 60;
      const endMins = startMins + durationMinutes;
      const endHour = Math.floor(endMins / 60);
      const endMin = endMins % 60;
      
      const startTime = `${startHour.toString().padStart(2, '0')}:${startMin.toString().padStart(2, '0')}:00`;
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;
      
      const hasBookingConflict = bookedSlots.rows.some((booking: any) => {
        const bookStart = booking.start_time;
        const bookEnd = booking.end_time;
        return (startTime < bookEnd && endTime > bookStart);
      });
      
      const hasBlockConflict = blockedSlots.rows.some((block: any) => {
        const blockStart = block.start_time;
        const blockEnd = block.end_time;
        return (startTime < blockEnd && endTime > blockStart);
      });
      
      slots.push({
        start_time: startTime,
        end_time: endTime,
        available: !hasBookingConflict && !hasBlockConflict
      });
    }
    
    res.json(slots);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/availability-blocks', async (req, res) => {
  try {
    const { bay_id, block_date, start_time, end_time, block_type, notes, created_by } = req.body;
    
    if (!bay_id || !block_date || !start_time || !end_time || !block_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO availability_blocks (bay_id, block_date, start_time, end_time, block_type, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [bay_id, block_date, start_time, end_time, block_type, notes, created_by]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Availability block creation error:', error);
    res.status(500).json({ error: 'Failed to create availability block' });
  }
});

router.get('/api/availability-blocks', async (req, res) => {
  try {
    const { start_date, end_date, bay_id } = req.query;
    
    let query = `SELECT ab.*, b.name as bay_name FROM availability_blocks ab
                 JOIN bays b ON ab.bay_id = b.id WHERE 1=1`;
    const params: any[] = [];
    
    if (start_date) {
      params.push(start_date);
      query += ` AND ab.block_date >= $${params.length}`;
    }
    if (end_date) {
      params.push(end_date);
      query += ` AND ab.block_date <= $${params.length}`;
    }
    if (bay_id) {
      params.push(bay_id);
      query += ` AND ab.bay_id = $${params.length}`;
    }
    
    query += ' ORDER BY ab.block_date, ab.start_time';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Availability blocks error:', error);
    res.status(500).json({ error: 'Failed to fetch availability blocks' });
  }
});

router.delete('/api/availability-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM availability_blocks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Delete block error:', error);
    res.status(500).json({ error: 'Failed to delete availability block' });
  }
});

export default router;
