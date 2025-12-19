import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

router.get('/api/cafe-menu', async (req, res) => {
  try {
    const { category, include_inactive } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (include_inactive !== 'true') {
      conditions.push('is_active = true');
    }
    
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }
    
    let query = 'SELECT * FROM cafe_items';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY sort_order, category, name';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    if (!isProduction) console.error('Cafe menu error:', error);
    res.status(500).json({ error: 'Failed to fetch cafe menu' });
  }
});

router.post('/api/cafe-menu', async (req, res) => {
  try {
    const { category, name, price, description, icon, image_url, is_active, sort_order } = req.body;
    
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO cafe_items (category, name, price, description, icon, image_url, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [category, name, price || 0, description || '', icon || '', image_url || '', is_active !== false, sort_order || 0]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Cafe item creation error:', error);
    res.status(500).json({ error: 'Failed to create cafe item' });
  }
});

router.put('/api/cafe-menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category, name, price, description, icon, image_url, is_active, sort_order } = req.body;
    
    const result = await pool.query(
      `UPDATE cafe_items 
       SET category = COALESCE($1, category),
           name = COALESCE($2, name),
           price = COALESCE($3, price),
           description = COALESCE($4, description),
           icon = COALESCE($5, icon),
           image_url = COALESCE($6, image_url),
           is_active = COALESCE($7, is_active),
           sort_order = COALESCE($8, sort_order)
       WHERE id = $9 RETURNING *`,
      [category, name, price, description, icon, image_url, is_active, sort_order, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cafe item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    if (!isProduction) console.error('Cafe item update error:', error);
    res.status(500).json({ error: 'Failed to update cafe item' });
  }
});

router.delete('/api/cafe-menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM cafe_items WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error: any) {
    if (!isProduction) console.error('Cafe item delete error:', error);
    res.status(500).json({ error: 'Failed to delete cafe item' });
  }
});

export default router;
