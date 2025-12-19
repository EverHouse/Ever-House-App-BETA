import { Router } from 'express';
import { isProduction } from '../core/db';
import { isAdmin } from '../core/middleware';
import { getOpenConflicts, acceptConflict, ignoreConflict } from '../services/conflictDetection';

const router = Router();

router.get('/api/admin/data-conflicts', isAdmin, async (req, res) => {
  try {
    const conflicts = await getOpenConflicts();
    
    const formattedConflicts = conflicts.map((c: any) => ({
      id: c.id,
      userId: c.user_id,
      email: c.email,
      mindbodyId: c.mindbody_id,
      firstName: c.first_name || c.metadata?.firstName || '',
      lastName: c.last_name || c.metadata?.lastName || '',
      currentTier: c.current_tier,
      incomingTier: c.incoming_tier,
      source: c.source,
      status: c.status,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));
    
    res.json(formattedConflicts);
  } catch (error: any) {
    if (!isProduction) console.error('Data conflicts error:', error);
    res.status(500).json({ error: 'Failed to fetch data conflicts' });
  }
});

router.post('/api/admin/data-conflicts/:id/accept', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedBy = (req as any).user?.email || 'admin';
    
    const result = await acceptConflict(parseInt(id), resolvedBy);
    res.json({ success: true, message: 'Tier updated successfully', newTier: result.newTier });
  } catch (error: any) {
    if (!isProduction) console.error('Accept conflict error:', error);
    res.status(error.message === 'Conflict not found or already resolved' ? 404 : 500)
      .json({ error: error.message || 'Failed to accept conflict' });
  }
});

router.post('/api/admin/data-conflicts/:id/ignore', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const resolvedBy = (req as any).user?.email || 'admin';
    
    await ignoreConflict(parseInt(id), resolvedBy);
    res.json({ success: true, message: 'Conflict dismissed' });
  } catch (error: any) {
    if (!isProduction) console.error('Ignore conflict error:', error);
    res.status(error.message === 'Conflict not found or already resolved' ? 404 : 500)
      .json({ error: error.message || 'Failed to ignore conflict' });
  }
});

export default router;
