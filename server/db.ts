import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import * as schema from '@shared/schema';
import WebSocket from 'ws';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// In development, configure WebSocket with SSL verification disabled
if (process.env.NODE_ENV === 'development') {
  // Create WebSocket constructor with SSL options that ignore certificate errors
  neonConfig.webSocketConstructor = class extends WebSocket {
    constructor(address: string, protocols?: string | string[]) {
      super(address, protocols, {
        rejectUnauthorized: false
      });
    }
  } as any;
  
  neonConfig.wsProxy = (host) => `${host}?sslmode=require`;
  neonConfig.useSecureWebSocket = true;
  neonConfig.pipelineTLS = true;
  neonConfig.pipelineConnect = false;
}

// Configure pool with connection limits
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 5, // Limit to 5 concurrent connections (Neon free tier allows ~10)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });
