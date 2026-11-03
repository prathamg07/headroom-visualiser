import { sql } from './index.js';
import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

export async function runMigrations() {
  console.log('Running database setup and enabling extensions...');

  // 1. Enable pg_trgm extension
  await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
  console.log('✓ pg_trgm extension enabled.');

  console.log('Database initialization complete.');
}

if (process.argv[1] && process.argv[1].endsWith('migrate.js')) {
  runMigrations()
    .then(() => {
      console.log('Migration finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
