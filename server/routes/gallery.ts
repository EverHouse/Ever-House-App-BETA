import { Router } from 'express';
import { db } from '../db';
import { galleryImages } from '../../shared/schema';
import { eq, asc } from 'drizzle-orm';
import { isStaffOrAdmin } from '../core/middleware';

const router = Router();

router.get('/api/gallery', async (req, res) => {
  try {
    const { include_inactive } = req.query;
    
    let images;
    if (include_inactive === 'true') {
      images = await db.select().from(galleryImages).orderBy(asc(galleryImages.sortOrder));
    } else {
      images = await db.select().from(galleryImages).where(eq(galleryImages.isActive, true)).orderBy(asc(galleryImages.sortOrder));
    }
    
    const formatted = images.map(img => ({
      id: img.id,
      img: img.imageUrl,
      imageUrl: img.imageUrl,
      category: img.category || 'venue',
      title: img.title,
      sortOrder: img.sortOrder,
      isActive: img.isActive
    }));
    
    res.json(formatted);
  } catch (error: any) {
    console.error('Gallery error:', error);
    res.status(500).json({ error: 'Failed to fetch gallery' });
  }
});

router.post('/api/admin/gallery', isStaffOrAdmin, async (req, res) => {
  try {
    const { title, imageUrl, category, sortOrder, isActive } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    
    const [newImage] = await db.insert(galleryImages).values({
      title: title || null,
      imageUrl,
      category: category || 'venue',
      sortOrder: sortOrder || 0,
      isActive: isActive !== false
    }).returning();
    
    res.status(201).json(newImage);
  } catch (error: any) {
    console.error('Gallery create error:', error);
    res.status(500).json({ error: 'Failed to create gallery image' });
  }
});

router.put('/api/admin/gallery/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, imageUrl, category, sortOrder, isActive } = req.body;
    
    const [updated] = await db.update(galleryImages)
      .set({
        title: title !== undefined ? title : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        category: category !== undefined ? category : undefined,
        sortOrder: sortOrder !== undefined ? sortOrder : undefined,
        isActive: isActive !== undefined ? isActive : undefined
      })
      .where(eq(galleryImages.id, parseInt(id)))
      .returning();
    
    if (!updated) {
      return res.status(404).json({ error: 'Gallery image not found' });
    }
    
    res.json(updated);
  } catch (error: any) {
    console.error('Gallery update error:', error);
    res.status(500).json({ error: 'Failed to update gallery image' });
  }
});

router.delete('/api/admin/gallery/:id', isStaffOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.delete(galleryImages).where(eq(galleryImages.id, parseInt(id)));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Gallery delete error:', error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});

export default router;
