import { Router } from 'express';
import { importTrackmanBookings, getUnmatchedBookings, resolveUnmatchedBooking, getImportRuns } from '../core/trackmanImport';
import path from 'path';

const router = Router();

router.get('/api/admin/trackman/unmatched', async (req, res) => {
  try {
    const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const bookings = await getUnmatchedBookings({ resolved, limit, offset });
    res.json(bookings);
  } catch (error: any) {
    console.error('Error fetching unmatched bookings:', error);
    res.status(500).json({ error: 'Failed to fetch unmatched bookings' });
  }
});

router.get('/api/admin/trackman/import-runs', async (req, res) => {
  try {
    const runs = await getImportRuns();
    res.json(runs);
  } catch (error: any) {
    console.error('Error fetching import runs:', error);
    res.status(500).json({ error: 'Failed to fetch import runs' });
  }
});

router.post('/api/admin/trackman/import', async (req, res) => {
  try {
    const { filename } = req.body;
    const user = (req as any).session?.user?.email || 'admin';
    
    const safeFilename = path.basename(filename || 'trackman_bookings_1767009308200.csv');
    if (!safeFilename.endsWith('.csv') || !/^[a-zA-Z0-9_\-\.]+$/.test(safeFilename)) {
      return res.status(400).json({ error: 'Invalid filename format' });
    }
    
    const csvPath = path.join(process.cwd(), 'attached_assets', safeFilename);
    
    const result = await importTrackmanBookings(csvPath, user);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to import bookings' });
  }
});

router.put('/api/admin/trackman/unmatched/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { memberEmail } = req.body;
    const resolvedBy = (req as any).session?.user?.email || 'admin';
    
    if (!memberEmail) {
      return res.status(400).json({ error: 'memberEmail is required' });
    }
    
    const success = await resolveUnmatchedBooking(parseInt(id), memberEmail, resolvedBy);
    
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Unmatched booking not found' });
    }
  } catch (error: any) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve unmatched booking' });
  }
});

export default router;
