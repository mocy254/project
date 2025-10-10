import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// In development, use fetch adapter instead of WebSocket to avoid SSL issues
if (process.env.NODE_ENV === 'development') {
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
