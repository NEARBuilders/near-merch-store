import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    testTimeout: 30000,
    fileParallelism: false,
    sequence: {
      hooks: 'stack',
    },
    env: {
      TEST_DATABASE_URL: 'postgres://postgres:postgres@localhost:5433/api_test',
    },
  },
  plugins: [
    tsconfigPaths({
      projects: ['./tsconfig.json'],
    }),
  ],
});
