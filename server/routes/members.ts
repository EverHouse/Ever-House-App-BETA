import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

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
