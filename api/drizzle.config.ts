import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'file:./marketplace.db',
    authToken: process.env.DATABASE_AUTH_TOKEN,
  },
});
