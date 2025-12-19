import type { Express } from "express";
import { isAuthenticated, isAdminEmail } from "./replitAuth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function isStaffEmail(email: string): Promise<boolean> {
  if (!email) return false;
  try {
    const result = await pool.query(
      'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking staff status:', error);
    return false;
  }
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session?.user;
      
      if (!user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const isStaff = await isStaffEmail(user.email);
      const isAdmin = await isAdminEmail(user.email);
      
      const userResult = await pool.query(
        'SELECT lifetime_visits, tags FROM users WHERE LOWER(email) = LOWER($1)',
        [user.email]
      );
      const dbUser = userResult.rows[0];
      
      const lastBookingResult = await pool.query(
        'SELECT booking_date FROM bookings WHERE LOWER(user_email) = LOWER($1) ORDER BY booking_date DESC LIMIT 1',
        [user.email]
      );
      const lastBookingDate = lastBookingResult.rows[0]?.booking_date || null;
      
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tier: user.tier,
        role: user.role,
        isStaff,
        isAdmin,
        lifetimeVisits: dbUser?.lifetime_visits || 0,
        tags: dbUser?.tags || [],
        lastBookingDate
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
