import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import ws from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// In development, use WebSocket with SSL verification disabled
if (process.env.NODE_ENV === 'development') {
  // Use WebSocket mode and configure SSL for WebSocket only
  neonConfig.webSocketConstructor = ws;
  neonConfig.wsProxy = (host) => `${host}?sslmode=require`;
  neonConfig.useSecureWebSocket = true;
  neonConfig.pipelineTLS = true;
  
  // Configure WebSocket SSL options
  neonConfig.pipelineConnect = false;
}

// Configure pool with connection limits and SSL settings
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit to 5 concurrent connections (Neon free tier allows ~10)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Disable SSL verification in development only for the database connection
  ssl: process.env.NODE_ENV === 'development' 
    ? { rejectUnauthorized: false }
    : true
});

export const db = drizzle(pool, { schema });
