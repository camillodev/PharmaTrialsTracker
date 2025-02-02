// @ts-ignore
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "./schema";
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure connection pool with retry logic
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5 second timeout
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
});

// Add error handling for the pool
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test the connection immediately
pool.connect()
  .then(client => {
    console.log('Database connection successful');
    client.release();
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

// Export the configured database instance
export const db = drizzle(pool, { schema });

// Export pool for direct access if needed
export { pool };