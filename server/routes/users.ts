import { Router } from 'express';
import { pool, isProduction } from '../core/db';
import { isAdmin, isStaffOrAdmin } from '../core/middleware';

const router = Router();

router.get('/api/staff-users', isStaffOrAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, is_active, created_at, created_by FROM staff_users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch staff users' });
  }
});

router.post('/api/staff-users', isAdmin, async (req, res) => {
  try {
    const { email, name, created_by } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO staff_users (email, name, is_active, created_by) VALUES ($1, $2, true, $3) RETURNING *',
      [email.toLowerCase().trim(), name || null, created_by || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This email is already a staff member' });
    }
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to add staff user' });
  }
});

router.put('/api/staff-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE staff_users SET email = COALESCE($1, email), name = COALESCE($2, name), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *',
      [email?.toLowerCase().trim(), name, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update staff user' });
  }
});

router.delete('/api/staff-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM staff_users WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    
    res.json({ message: 'Staff user removed', staff: result.rows[0] });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to remove staff user' });
  }
});

router.get('/api/admin-users', isAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, is_active, created_at, created_by FROM admin_users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

router.post('/api/admin-users', isAdmin, async (req, res) => {
  try {
    const { email, name, created_by } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    
    const result = await pool.query(
      'INSERT INTO admin_users (email, name, is_active, created_by) VALUES ($1, $2, true, $3) RETURNING *',
      [email.toLowerCase().trim(), name || null, created_by || null]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'This email is already an admin' });
    }
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to add admin user' });
  }
});

router.put('/api/admin-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, is_active } = req.body;
    
    const result = await pool.query(
      'UPDATE admin_users SET email = COALESCE($1, email), name = COALESCE($2, name), is_active = COALESCE($3, is_active) WHERE id = $4 RETURNING *',
      [email?.toLowerCase().trim(), name, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

router.delete('/api/admin-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const adminCount = await pool.query('SELECT COUNT(*) FROM admin_users WHERE is_active = true');
    if (parseInt(adminCount.rows[0].count) <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last active admin' });
    }
    
    const result = await pool.query(
      'DELETE FROM admin_users WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({ message: 'Admin user removed', admin: result.rows[0] });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to remove admin user' });
  }
});

export default router;
