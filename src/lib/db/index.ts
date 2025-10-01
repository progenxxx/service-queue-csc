import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// Configure postgres client with connection pooling
const client = postgres(connectionString, {
  max: 20, // Maximum number of connections in the pool
  idle_timeout: 40, // Close idle connections after 20 seconds
  connect_timeout: 60, // Connection timeout in seconds
  prepare: false, // Disable prepared statements for better compatibility
});

export const db = drizzle(client, { schema });