# BOS Testing & Perf Loop

This repo already has a CLI-driven test harness (Vitest + Playwright + process/port monitoring). The goal is a tight iteration loop:

1) Start an isolated DB
2) Apply Drizzle migrations
3) Seed minimal data
4) Start the API (or full `bos dev/start`)
5) Run a flow and capture logs/perf

## Quick Commands

```bash
# Install deps for the CLI package (it is not part of the root workspace)
bun install

# Run the Docker Postgres backed API mutation integration test
cd packages/cli
bunx vitest run tests/integration/marketplace-product-mutations.test.ts
```

## DB Strategy

Default is Docker Postgres to match `api/drizzle.config.ts` (dialect: postgresql).

- Container is started with a random host port ("-p 0:5432")
- Migrations are applied from `api/src/db/migrations/*.sql`
- Seed data is inserted via `psql`

## Testkit Helpers

Helper modules live under `packages/cli/tests/testkit/`:

- `packages/cli/tests/testkit/docker-postgres.ts`: start/stop Postgres container + produce `API_DATABASE_URL`
- `packages/cli/tests/testkit/postgres-migrations.ts`: apply migration SQL + run ad-hoc `psql`
- `packages/cli/tests/testkit/api-dev-server.ts`: start `api` dev server and wait until it reports `{ status: "ready" }` on `/`

## Common Failures (From Logs)

### 1) TanStack Router route-file warning

If you see:

"Route file ... does not export a Route"

It means a non-route `.tsx` file is inside `ui/src/routes/**`.

Fix options:

- Move the file out of `ui/src/routes/**` (recommended)
- Or prefix the filename with `-` (the router ignores files with `routeFileIgnorePrefix: "-"`)

### 2) Module Federation shared version mismatch (`catalog:`)

If you see mismatches like:

"every-plugin ... does not satisfy the requirement ... needs catalog:)"

The host/runtime cannot compare `catalog:` strings as semver.

Fix options:

- Ensure shared singleton modules use real semver strings at runtime
- Or configure MF shared entries with `requiredVersion: false` / non-strict versioning for those packages

### 3) DB flake during container init

Sometimes Postgres reports ready and then restarts during init. If migrations fail with "system is shutting down", retry once after a short delay.
