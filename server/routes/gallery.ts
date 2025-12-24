import { Router } from 'express';
import { db } from '../db';
import { galleryImages } from '../../shared/schema';
import { eq, asc } from 'drizzle-orm';

const router = Router();

router.get('/api/gallery', async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = db.select().from(galleryImages).where(eq(galleryImages.isActive, true));
    
    const images = await query.orderBy(asc(galleryImages.sortOrder));
    
    const formatted = images.map(img => ({
      id: img.id,
      img: img.imageUrl,
      category: img.category || 'venue',
      title: img.title
    }));
    
    res.json(formatted);
  } catch (error: any) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

export default router;
