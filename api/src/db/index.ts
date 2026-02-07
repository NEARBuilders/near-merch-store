import { drizzle } from "drizzle-orm/postgres-js";
import pg from "postgres";
import * as schema from "./schema";
import { Context, Effect, Layer } from "every-plugin/effect";

type DrizzleDatabase = ReturnType<typeof drizzle<typeof schema>>;
type SqlClient = import("postgres").Sql<Record<string, never>>;

export class Database extends Context.Tag("Database")<Database, DrizzleDatabase>() {}

export const DatabaseLive = (url: string) =>
  Layer.effect(
    Database,
    Effect.sync<DrizzleDatabase>(() => {
      const client = pg(url, {
        max: 10,
        idle_timeout: 20 * 1000,
        connect_timeout: 10 * 1000,
      }) as SqlClient;
      return drizzle({ client, schema });
    })
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