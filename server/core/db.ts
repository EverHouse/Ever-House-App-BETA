import { Pool } from 'pg';

export const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10,
});

pool.on('error', (err) => {
  console.error('[Database] Unexpected pool error:', err.message);
});

pool.on('connect', () => {
  if (!isProduction) {
    console.log('[Database] New client connected');
  }
});
