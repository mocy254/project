import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Always use fetch adapter and disable WebSocket to avoid SSL issues
neonConfig.fetchConnectionCache = true;
neonConfig.poolQueryViaFetch = true;

// In development, globally disable SSL verification 
// This is safe for development as we're only connecting to our own database
if (process.env.NODE_ENV === 'development') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// Configure pool with connection limits
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit to 5 concurrent connections (Neon free tier allows ~10)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
