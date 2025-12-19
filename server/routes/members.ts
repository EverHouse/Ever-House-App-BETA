import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

router.get('/api/members/:email/details', async (req, res) => {
  try {
    const { email } = req.params;
    
    const userResult = await pool.query(
      `SELECT id, email, first_name, last_name, tier, tags, role, phone, mindbody_client_id, lifetime_visits 
       FROM users WHERE LOWER(email) = LOWER($1)`,
      [decodeURIComponent(email)]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const user = userResult.rows[0];
    
    const lastBookingResult = await pool.query(
      'SELECT booking_date FROM bookings WHERE LOWER(user_email) = LOWER($1) ORDER BY booking_date DESC LIMIT 1',
      [decodeURIComponent(email)]
    );
    const lastBookingDate = lastBookingResult.rows[0]?.booking_date || null;
    
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      tier: user.tier,
      tags: user.tags || [],
      role: user.role,
      phone: user.phone,
      mindbodyClientId: user.mindbody_client_id,
      lifetimeVisits: user.lifetime_visits || 0,
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
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (role) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }
    
    if (tags !== undefined) {
      updates.push(`tags = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(tags));
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    values.push(id);
    const updateQuery = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;
    
    const result = await pool.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      const insertResult = await pool.query(
        'INSERT INTO users (id, role, tags) VALUES ($1, $2, $3::jsonb) ON CONFLICT (id) DO UPDATE SET role = COALESCE($2, users.role), tags = COALESCE($3::jsonb, users.tags), updated_at = NOW() RETURNING *',
        [id, role || 'member', JSON.stringify(tags || [])]
      );
      return res.json(insertResult.rows[0]);
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

export default router;
