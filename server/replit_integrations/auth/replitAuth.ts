import session from "express-session";
import type { RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { Pool } from "pg";

const authPool = new Pool({ connectionString: process.env.DATABASE_URL });

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

export async function isAdminEmail(email: string): Promise<boolean> {
  try {
    const result = await authPool.query(
      'SELECT id FROM admin_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Session expiry is handled by express-session cookie maxAge
  // No need to check expires_at since the session store handles TTL
  return next();
};

export const isAdmin: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const email = user.email?.toLowerCase() || '';
  const adminStatus = await isAdminEmail(email);
  
  if (!adminStatus) {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }

  return next();
};

export const isStaffOrAdmin: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const email = user.email?.toLowerCase() || '';
  
  const adminStatus = await isAdminEmail(email);
  if (adminStatus) {
    return next();
  }

  try {
    const result = await authPool.query(
      'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    if (result.rows.length > 0) {
      return next();
    }
  } catch (error) {
    console.error('Error checking staff status:', error);
  }

  return res.status(403).json({ message: "Forbidden: Staff access required" });
};
