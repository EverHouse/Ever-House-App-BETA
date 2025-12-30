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
    
    // Add reschedule_booking_id column for reschedule workflow
    await db.execute(sql`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'booking_requests' AND column_name = 'reschedule_booking_id'
        ) THEN
          ALTER TABLE booking_requests ADD COLUMN reschedule_booking_id INTEGER;
        END IF;
      END $$;
    `);
  } catch (error: any) {
    console.error('[DB Init] Failed to ensure constraints:', error.message);
  }
}
