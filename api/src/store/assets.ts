import { count, eq } from "drizzle-orm";
import { Context, Effect, Layer } from "every-plugin/effect";
import * as schema from "../db/schema";
import { Database } from "./database";

export interface Asset {
  id: string;
  url: string;
  type: string;
  name: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export class AssetStore extends Context.Tag("AssetStore")<
  AssetStore,
  {
    readonly find: (id: string) => Effect.Effect<Asset | null, Error>;
    readonly findMany: (options?: {
      type?: string;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<{ assets: Asset[]; total: number }, Error>;
    readonly create: (asset: {
      id: string;
      url: string;
      type: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }) => Effect.Effect<Asset, Error>;
    readonly update: (
      id: string,
      data: {
        url?: string;
        name?: string;
        metadata?: Record<string, unknown>;
      },
    ) => Effect.Effect<Asset | null, Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
  }
>() {}

export const AssetStoreLive = Layer.effect(
  AssetStore,
  Effect.gen(function* () {
    const db = yield* Database;

    const rowToAsset = (row: typeof schema.assets.$inferSelect): Asset => ({
      id: row.id,
      url: row.url,
      type: row.type,
      name: row.name || null,
      metadata: row.metadata || null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    });

    return {
      find: (id) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.assets)
              .where(eq(schema.assets.id, id))
              .limit(1);
            return results.length > 0 ? rowToAsset(results[0]!) : null;
          },
          catch: (error) => new Error(`Failed to find asset: ${error}`),
        }),

      findMany: (options) =>
        Effect.tryPromise({
          try: async () => {
            const { type, limit = 50, offset = 0 } = options || {};
            const conditions = type ? [eq(schema.assets.type, type)] : [];
            const whereClause = conditions.length > 0 ? conditions[0] : undefined;

            const [countResult] = await db
              .select({ count: count() })
              .from(schema.assets)
              .where(whereClause);

            const total = Number(countResult?.count ?? 0);

            const results = await db
              .select()
              .from(schema.assets)
              .where(whereClause)
              .limit(limit)
              .offset(offset);

            return { assets: results.map(rowToAsset), total };
          },
          catch: (error) => new Error(`Failed to find assets: ${error}`),
        }),

      create: (data) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db.insert(schema.assets).values({
              id: data.id,
              url: data.url,
              type: data.type,
              name: data.name || null,
              metadata: data.metadata || null,
              createdAt: now,
              updatedAt: now,
            });

            const results = await db
              .select()
              .from(schema.assets)
              .where(eq(schema.assets.id, data.id))
              .limit(1);

            if (results.length === 0) {
              throw new Error("Asset not found after create");
            }
            return rowToAsset(results[0]!);
          },
          catch: (error) => new Error(`Failed to create asset: ${error}`),
        }),

      update: (id, data) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();
            await db
              .update(schema.assets)
              .set({
                ...(data.url !== undefined ? { url: data.url } : {}),
                ...(data.name !== undefined ? { name: data.name } : {}),
                ...(data.metadata !== undefined ? { metadata: data.metadata } : {}),
                updatedAt: now,
              })
              .where(eq(schema.assets.id, id));

            const results = await db
              .select()
              .from(schema.assets)
              .where(eq(schema.assets.id, id))
              .limit(1);

            return results.length > 0 ? rowToAsset(results[0]!) : null;
          },
          catch: (error) => new Error(`Failed to update asset: ${error}`),
        }),

      delete: (id) =>
        Effect.tryPromise({
          try: async () => {
            await db.delete(schema.assets).where(eq(schema.assets.id, id));
          },
          catch: (error) => new Error(`Failed to delete asset: ${error}`),
        }),
    };
  }),
);
