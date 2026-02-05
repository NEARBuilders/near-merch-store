import { drizzle } from "drizzle-orm/postgres-js";
import pg from "postgres";
import * as schema from "./schema";

export const createDatabase = (url: string) => {
  const client = pg(url);

  return drizzle({ client, schema });
};

export type Database = ReturnType<typeof createDatabase>;
