import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { startDockerPostgres } from "../testkit/docker-postgres";
import { applyPostgresSqlFile, psql } from "../testkit/postgres-migrations";
import {
  startApiDevServer,
  type ApiDevServerHandle,
  getFederationVersionMismatchLines,
} from "../testkit/api-dev-server";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../../");

const TEST_TIMEOUT = 180_000;

async function jsonFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}: ${text}`);
  }
  return json;
}

describe(
  "Marketplace API mutations (Docker Postgres)",
  () => {
    it(
      "updates featured/tags/collections/productType and stays consistent",
      async () => {
        const pg = await startDockerPostgres({ db: "api" });
        let api: ApiDevServerHandle | null = null;
        try {
          const migrationPath = resolve(
            REPO_ROOT,
            "api/src/db/migrations/0000_eminent_princess_powerful.sql",
          );
          await applyPostgresSqlFile({
            containerId: pg.containerId,
            db: "api",
            user: "postgres",
            sqlFilePath: migrationPath,
          });

          api = await startApiDevServer({
            repoRoot: REPO_ROOT,
            apiPort: 3014,
            env: {
              API_DATABASE_URL: pg.databaseUrl,
            },
            startupTimeoutMs: 120_000,
          });

          const federationMismatches = getFederationVersionMismatchLines(api.logs);
          if (federationMismatches.length > 0) {
            // eslint-disable-next-line no-console
            console.warn(
              "[test] Federation version mismatch detected:\n" +
                federationMismatches.join("\n"),
            );
          }

          const productId = randomUUID();
          const publicKey = "test_public_key_123456";
          const slug = "test-product-1";

          await psql({
            containerId: pg.containerId,
            db: "api",
            user: "postgres",
            sql: `INSERT INTO collections (slug, name) VALUES ('test-collection', 'Test Collection') ON CONFLICT (slug) DO NOTHING;`,
          });

          await psql({
            containerId: pg.containerId,
            db: "api",
            user: "postgres",
            sql: `INSERT INTO products (id, public_key, slug, name, price, fulfillment_provider, source)
                  VALUES ('${productId}', '${publicKey}', '${slug}', 'Test Product', 2599, 'printful', 'test')
                  ON CONFLICT (id) DO NOTHING;`,
          });

          // sanity: product exists
          const before = await jsonFetch(`${api.apiUrl}/products/${productId}`);
          expect(before?.product?.id).toBe(productId);
          expect(before?.product?.featured).toBe(false);

          // featured
          await jsonFetch(`${api.apiUrl}/products/${productId}/featured`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: productId, featured: true }),
          });

          // tags
          await jsonFetch(`${api.apiUrl}/products/${productId}/tags`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: productId, tags: ["alpha", "beta"] }),
          });

          // collections (aka categories)
          await jsonFetch(`${api.apiUrl}/products/${productId}/categories`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: productId, categoryIds: ["test-collection"] }),
          });

          // product type
          await jsonFetch(`${api.apiUrl}/products/${productId}/product-type`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: productId, productTypeSlug: "hoodies" }),
          });

          const after = await jsonFetch(`${api.apiUrl}/products/${productId}`);
          expect(after?.product?.featured).toBe(true);
          expect(after?.product?.tags).toEqual(["alpha", "beta"]);
          expect(after?.product?.collections?.map((c: any) => c.slug)).toEqual([
            "test-collection",
          ]);
          expect(after?.product?.productType?.slug).toBe("hoodies");
        } catch (e) {
          if (api) {
            // eslint-disable-next-line no-console
            console.error("\n=== API DEV SERVER LOGS ===\n" + api.logs.join("\n"));
          }
          throw e;
        } finally {
          if (api) {
            await api.stop();
          }
          await pg.stop();
        }
      },
      TEST_TIMEOUT,
    );
  },
);
