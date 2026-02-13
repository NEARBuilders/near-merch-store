import { drizzle } from "drizzle-orm/postgres-js";
import pg from "postgres";
import * as schema from "./schema";
import { Context, Effect, Layer } from "every-plugin/effect";

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = import("postgres").Sql<Record<string, never>>;

const clientMap = new WeakMap<DrizzleDatabase, SqlClient>();

export class Database extends Context.Tag("Database")<Database, DrizzleDatabase>() {}

export const DatabaseLive = (url: string) =>
  Layer.scoped(
    Database,
    Effect.acquireRelease(
      Effect.tryPromise({
        try: async () => {
          const client = pg(url, {
            max: 2,
            idle_timeout: 20 * 1000,
            connect_timeout: 10 * 1000,
          }) as SqlClient;
          const db = drizzle({ client, schema });
          clientMap.set(db, client);
          return db;
        },
        catch: (error) => new Error(`Failed to create database: ${error}`),
      }),
      (db) =>
        Effect.sync(() => {
          const client = clientMap.get(db);
          if (client) {
            client.end();
            clientMap.delete(db);
          }
        })
    )
  );

export const createDatabase = (url: string): DrizzleDatabase => {
  const client = pg(url, {
    max: 2,
    idle_timeout: 20 * 1000,
    connect_timeout: 10 * 1000,
  }) as SqlClient;
  return drizzle({ client, schema });
};

export type DatabaseType = DrizzleDatabase;