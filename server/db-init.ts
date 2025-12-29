import { sql } from 'drizzle-orm';
import { db } from './db';

export async function ensureDatabaseConstraints() {
  try {
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'booking_requests_status_check'
        ) THEN
          ALTER TABLE booking_requests DROP CONSTRAINT booking_requests_status_check;
        END IF;
        
        ALTER TABLE booking_requests ADD CONSTRAINT booking_requests_status_check 
          CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'attended', 'no_show'));

        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'booking_requests_duration_minutes_check'
        ) THEN
          ALTER TABLE booking_requests DROP CONSTRAINT booking_requests_duration_minutes_check;
        END IF;
        
        ALTER TABLE booking_requests ADD CONSTRAINT booking_requests_duration_minutes_check 
          CHECK (duration_minutes IN (30, 60, 90, 120, 150, 180, 210, 240, 270, 300));
      END $$;
    `);
  } catch (error: any) {
    console.error('[DB Init] Failed to ensure constraints:', error.message);
  }
}
