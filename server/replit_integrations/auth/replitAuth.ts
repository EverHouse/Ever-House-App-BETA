import session from "express-session";
import type { RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { Pool } from "pg";

let authPool: Pool | null = null;

function getAuthPool(): Pool | null {
  if (authPool) return authPool;
  
  if (!process.env.DATABASE_URL) {
    console.warn('[Auth Pool] DATABASE_URL not configured - database features disabled');
    return null;
  }
  
  try {
    authPool = new Pool({ 
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: 10000,
    });

    authPool.on('error', (err) => {
      console.error('[Auth Pool] Unexpected error:', err.message);
    });
    
    return authPool;
  } catch (err: any) {
    console.warn('[Auth Pool] Failed to create pool:', err.message);
    return null;
  }
}

export function getSession() {
  const sessionSecret = process.env.SESSION_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!sessionSecret) {
    console.warn('[Session] SESSION_SECRET is missing - using in-memory session store');
    return session({
      secret: 'temporary-fallback-secret-' + Date.now(),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: true, maxAge: 3600000 },
    });
  }
  
  if (!databaseUrl) {
    console.warn('[Session] DATABASE_URL is missing - using in-memory session store');
    return session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: true, maxAge: 3600000 },
    });
  }
  
  try {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000;
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: databaseUrl,
      createTableIfMissing: true,
      ttl: sessionTtl,
      tableName: "sessions",
      errorLog: (err: Error) => {
        console.error('[Session Store] Error:', err.message);
      },
    });
    
    return session({
      secret: sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: sessionTtl,
      },
    });
  } catch (err: any) {
    console.warn('[Session] Failed to create Postgres session store, using in-memory:', err.message);
    return session({
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, secure: true, maxAge: 3600000 },
    });
  }
}

export async function isAdminEmail(email: string): Promise<boolean> {
  const pool = getAuthPool();
  if (!pool) return false;
  
  try {
    const result = await pool.query(
      'SELECT id FROM admin_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    return result.rows.length > 0;
  } catch (error: any) {
    console.error('Error checking admin status:', error.message);
    return false;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = (req.session as any)?.user;

  if (!user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

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

  const pool = getAuthPool();
  if (!pool) {
    return res.status(403).json({ message: "Forbidden: Staff access required" });
  }

  try {
    const result = await pool.query(
      'SELECT id FROM staff_users WHERE LOWER(email) = LOWER($1) AND is_active = true',
      [email]
    );
    if (result.rows.length > 0) {
      return next();
    }
  } catch (error: any) {
    console.error('Error checking staff status:', error.message);
  }

  return res.status(403).json({ message: "Forbidden: Staff access required" });
};
