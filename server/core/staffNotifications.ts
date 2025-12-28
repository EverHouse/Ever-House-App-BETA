import { eq } from 'drizzle-orm';
import { db } from '../db';
import { notifications, staffUsers, adminUsers } from '../../shared/schema';

export async function getStaffAndAdminEmails(): Promise<string[]> {
  try {
    const [staffEmails, adminEmails] = await Promise.all([
      db.select({ email: staffUsers.email })
        .from(staffUsers)
        .where(eq(staffUsers.isActive, true)),
      db.select({ email: adminUsers.email })
        .from(adminUsers)
        .where(eq(adminUsers.isActive, true)),
    ]);
    
    const allEmails = new Set([
      ...staffEmails.map(row => row.email),
      ...adminEmails.map(row => row.email),
    ]);
    
    return Array.from(allEmails);
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
