import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Check if email is in staff_users table
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

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user with role
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      
      if (user && user.email) {
        const isStaff = await isStaffEmail(user.email);
        (user as any).isStaff = isStaff;
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
