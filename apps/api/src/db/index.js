import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import dotenv from 'dotenv';
import * as schema from './schema.js';

dotenv.config({ path: '../../.env' });

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:admin123@localhost:8000/headroom';

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sql, { schema });
