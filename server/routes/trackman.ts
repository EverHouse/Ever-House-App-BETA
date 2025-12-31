import { Router } from 'express';
import { importTrackmanBookings, getUnmatchedBookings, resolveUnmatchedBooking, getImportRuns } from '../core/trackmanImport';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { isAdmin } from '../core/middleware';

const router = Router();

const uploadDir = path.join(process.cwd(), 'uploads', 'trackman');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_\-\.]/g, '_');
    cb(null, `trackman_${timestamp}_${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.get('/api/admin/trackman/unmatched', isAdmin, async (req, res) => {
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

router.get('/api/admin/trackman/import-runs', isAdmin, async (req, res) => {
  try {
    const runs = await getImportRuns();
    res.json(runs);
  } catch (error: any) {
    console.error('Error fetching import runs:', error);
    res.status(500).json({ error: 'Failed to fetch import runs' });
  }
});

router.post('/api/admin/trackman/import', isAdmin, async (req, res) => {
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

router.post('/api/admin/trackman/upload', isAdmin, upload.single('file'), async (req, res) => {
  let csvPath: string | undefined;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const user = (req as any).session?.user?.email || 'admin';
    csvPath = req.file.path;
    
    const result = await importTrackmanBookings(csvPath, user);
    
    res.json({
      success: true,
      filename: req.file.filename,
      ...result
    });
  } catch (error: any) {
    console.error('Upload/Import error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload and import bookings' });
  } finally {
    if (csvPath && fs.existsSync(csvPath)) {
      try {
        fs.unlinkSync(csvPath);
      } catch (cleanupErr) {
        console.error('Failed to cleanup uploaded file:', cleanupErr);
      }
    }
  }
});

router.put('/api/admin/trackman/unmatched/:id/resolve', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { memberEmail } = req.body;
    const resolvedBy = (req as any).session?.user?.email || 'admin';
    
    if (!memberEmail) {
      return res.status(400).json({ error: 'memberEmail is required' });
    }
    
    const result = await resolveUnmatchedBooking(parseInt(id), memberEmail, resolvedBy);
    
    if (result.success) {
      res.json({ 
        success: true, 
        resolved: result.resolved,
        autoResolved: result.autoResolved,
        message: result.autoResolved > 0 
          ? `Resolved ${result.resolved} booking(s) (${result.autoResolved} auto-resolved with same email)`
          : 'Booking resolved successfully'
      });
    } else {
      res.status(404).json({ error: 'Unmatched booking not found' });
    }
  } catch (error: any) {
    console.error('Resolve error:', error);
    res.status(500).json({ error: 'Failed to resolve unmatched booking' });
  }
});

export default router;
