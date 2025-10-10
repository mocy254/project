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

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
