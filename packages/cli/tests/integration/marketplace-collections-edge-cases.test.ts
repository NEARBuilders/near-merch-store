import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { startDockerPostgres } from "../testkit/docker-postgres";
import { applyPostgresSqlFile } from "../testkit/postgres-migrations";
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

  return { ok: res.ok, status: res.status, json, text };
}

describe(
  "Marketplace collections edge cases (Docker Postgres)",
  () => {
    it(
      "handles empty state, create/update/delete, and NOT_FOUND",
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

          // empty state
          const emptyCollections = await jsonFetch(`${api.apiUrl}/collections`);
          expect(emptyCollections.ok).toBe(true);
          expect(Array.isArray(emptyCollections.json?.collections)).toBe(true);

          // create category (aka collection)
          const created = await jsonFetch(`${api.apiUrl}/categories`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name: "Alpha", slug: "alpha" }),
          });
          expect(created.ok).toBe(true);
          expect(created.json?.category?.slug).toBe("alpha");

          // should appear in both endpoints
          const categories = await jsonFetch(`${api.apiUrl}/categories`);
          expect(categories.ok).toBe(true);
          expect(categories.json?.categories?.some((c: any) => c.slug === "alpha")).toBe(true);

          const collections = await jsonFetch(`${api.apiUrl}/collections`);
          expect(collections.ok).toBe(true);
          expect(collections.json?.collections?.some((c: any) => c.slug === "alpha")).toBe(true);

          // detail
          const detail = await jsonFetch(`${api.apiUrl}/collections/alpha`);
          expect(detail.ok).toBe(true);
          expect(detail.json?.collection?.slug).toBe("alpha");
          expect(Array.isArray(detail.json?.products)).toBe(true);

          // update
          const updated = await jsonFetch(`${api.apiUrl}/collections/alpha`, {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              slug: "alpha",
              description: "Alpha collection",
              showInCarousel: false,
              carouselOrder: 5,
            }),
          });
          expect(updated.ok).toBe(true);
          expect(updated.json?.collection?.slug).toBe("alpha");
          expect(updated.json?.collection?.showInCarousel).toBe(false);
          expect(updated.json?.collection?.carouselOrder).toBe(5);

          // featured product set/unset should not error (unset here)
          const featuredUnset = await jsonFetch(`${api.apiUrl}/collections/alpha/featured-product`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ slug: "alpha", productId: null }),
          });
          expect(featuredUnset.ok).toBe(true);

          // delete
          const deleted = await jsonFetch(`${api.apiUrl}/categories/alpha`, {
            method: "DELETE",
          });
          expect(deleted.ok).toBe(true);
          expect(deleted.json?.success).toBe(true);

          const missing = await jsonFetch(`${api.apiUrl}/collections/alpha`);
          expect(missing.ok).toBe(false);
          expect(missing.status).toBe(404);
          expect(missing.json?.code).toBe("NOT_FOUND");
        } catch (e) {
          if (api) {
            // eslint-disable-next-line no-console
            console.error("\n=== API DEV SERVER LOGS ===\n" + api.logs.join("\n"));
          }
          throw e;
        } finally {
          if (api) await api.stop();
          await pg.stop();
        }
      },
      TEST_TIMEOUT,
    );
  },
);
