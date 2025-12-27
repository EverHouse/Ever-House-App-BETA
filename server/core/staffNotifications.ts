import { pool } from './db';
import { db } from '../db';
import { notifications } from '../../shared/schema';

export async function getStaffAndAdminEmails(): Promise<string[]> {
  try {
    const result = await pool.query(`
      SELECT email FROM staff_users WHERE is_active = true
      UNION
      SELECT email FROM admin_users WHERE is_active = true
    `);
    return result.rows.map(row => row.email);
  } catch (error) {
    console.error('Failed to get staff/admin emails:', error);
    return [];
  }
}

export async function notifyAllStaff(
  title: string,
  message: string,
  type: string,
  relatedId?: number,
  relatedType?: string
): Promise<void> {
  const emails = await getStaffAndAdminEmails();
  if (emails.length === 0) return;
  
  const notificationValues = emails.map(email => ({
    userEmail: email,
    title,
    message,
    type,
    relatedId: relatedId ?? null,
    relatedType: relatedType ?? null,
  }));
  
  try {
    await db.insert(notifications).values(notificationValues);
  } catch (error) {
    console.error('Failed to insert staff notifications:', error);
  }
}
