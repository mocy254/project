import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// In development, disable TLS certificate verification for Neon's fetch adapter
// This bypasses self-signed certificate errors while keeping encryption enabled
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  neonConfig.fetchConnectionCache = true;
  neonConfig.poolQueryViaFetch = true;
}

// Configure pool with connection limits to avoid "Too many connections" errors
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit to 5 concurrent connections (Neon free tier allows ~10)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
