import { Router } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { db } from '../db';
import { staffUsers, adminUsers } from '../../shared/schema';
import { isProduction } from '../core/db';
import { isAdmin, isStaffOrAdmin } from '../core/middleware';

const router = Router();

router.get('/api/staff-users', isStaffOrAdmin, async (req, res) => {
  try {
    const result = await db.select({
      id: staffUsers.id,
      email: staffUsers.email,
      name: staffUsers.name,
      is_active: staffUsers.isActive,
      created_at: staffUsers.createdAt,
      created_by: staffUsers.createdBy
    })
      .from(staffUsers)
      .orderBy(desc(staffUsers.createdAt));
    res.json(result);
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
    
    const result = await db.insert(staffUsers)
      .values({
        email: email.toLowerCase().trim(),
        name: name || null,
        isActive: true,
        createdBy: created_by || null
      })
      .returning();
    
    res.status(201).json({
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      is_active: result[0].isActive,
      created_at: result[0].createdAt,
      created_by: result[0].createdBy
    });
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
    
    const updateData: Record<string, any> = {};
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.isActive = is_active;
    
    const result = await db.update(staffUsers)
      .set(updateData)
      .where(eq(staffUsers.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    
    res.json({
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      is_active: result[0].isActive,
      created_at: result[0].createdAt,
      created_by: result[0].createdBy
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update staff user' });
  }
});

router.delete('/api/staff-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await db.delete(staffUsers)
      .where(eq(staffUsers.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Staff user not found' });
    }
    
    res.json({ 
      message: 'Staff user removed', 
      staff: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        is_active: result[0].isActive,
        created_at: result[0].createdAt,
        created_by: result[0].createdBy
      }
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to remove staff user' });
  }
});

router.get('/api/admin-users', isAdmin, async (req, res) => {
  try {
    const result = await db.select({
      id: adminUsers.id,
      email: adminUsers.email,
      name: adminUsers.name,
      is_active: adminUsers.isActive,
      created_at: adminUsers.createdAt,
      created_by: adminUsers.createdBy
    })
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
    res.json(result);
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
    
    const result = await db.insert(adminUsers)
      .values({
        email: email.toLowerCase().trim(),
        name: name || null,
        isActive: true,
        createdBy: created_by || null
      })
      .returning();
    
    res.status(201).json({
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      is_active: result[0].isActive,
      created_at: result[0].createdAt,
      created_by: result[0].createdBy
    });
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
    
    const updateData: Record<string, any> = {};
    if (email !== undefined) updateData.email = email.toLowerCase().trim();
    if (name !== undefined) updateData.name = name;
    if (is_active !== undefined) updateData.isActive = is_active;
    
    const result = await db.update(adminUsers)
      .set(updateData)
      .where(eq(adminUsers.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({
      id: result[0].id,
      email: result[0].email,
      name: result[0].name,
      is_active: result[0].isActive,
      created_at: result[0].createdAt,
      created_by: result[0].createdBy
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to update admin user' });
  }
});

router.delete('/api/admin-users/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const adminCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true));
    
    if (adminCount[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last active admin' });
    }
    
    const result = await db.delete(adminUsers)
      .where(eq(adminUsers.id, parseInt(id)))
      .returning();
    
    if (result.length === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }
    
    res.json({ 
      message: 'Admin user removed', 
      admin: {
        id: result[0].id,
        email: result[0].email,
        name: result[0].name,
        is_active: result[0].isActive,
        created_at: result[0].createdAt,
        created_by: result[0].createdBy
      }
    });
  } catch (error: any) {
    if (!isProduction) console.error('API error:', error);
    res.status(500).json({ error: 'Failed to remove admin user' });
  }
});

export default router;
