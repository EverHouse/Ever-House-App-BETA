import { Router } from 'express';
import { pool, isProduction } from '../core/db';

const router = Router();

const TIER_GUEST_PASSES: Record<string, number> = {
  'Social': 2,
  'Core': 4,
  'Premium': 8,
  'Corporate': 15
};

router.get('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { tier } = req.query;
    const passesTotal = TIER_GUEST_PASSES[tier as string] || 4;
    
    let result = await pool.query(
      'SELECT * FROM guest_passes WHERE member_email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO guest_passes (member_email, passes_used, passes_total) VALUES ($1, 0, $2)',
        [email, passesTotal]
      );
      result = await pool.query(
        'SELECT * FROM guest_passes WHERE member_email = $1',
        [email]
      );
    } else if (result.rows[0].passes_total !== passesTotal) {
      await pool.query(
        'UPDATE guest_passes SET passes_total = $1 WHERE member_email = $2',
        [passesTotal, email]
      );
      result.rows[0].passes_total = passesTotal;
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.post('/api/guest-passes/:email/use', async (req, res) => {
  try {
    const { email } = req.params;
    const result = await pool.query(
      'UPDATE guest_passes SET passes_used = passes_used + 1 WHERE member_email = $1 AND passes_used < passes_total RETURNING *',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No guest passes remaining' });
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

router.put('/api/guest-passes/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { passes_total } = req.body;
    
    const result = await pool.query(
      'UPDATE guest_passes SET passes_total = $1 WHERE member_email = $2 RETURNING *',
      [passes_total, email]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const data = result.rows[0];
    res.json({
      passes_used: data.passes_used,
      passes_total: data.passes_total,
      passes_remaining: data.passes_total - data.passes_used
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Request failed' });
  }
});

export default router;
