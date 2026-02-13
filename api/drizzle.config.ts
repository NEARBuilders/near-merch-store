import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.API_DATABASE_URL || 'postgres://postgres:postgres@localhost:5433/api',
  },
  verbose: true,
  strict: true,
});
