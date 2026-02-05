import { Context, Layer } from "every-plugin/effect";
import { createDatabase, type Database as DrizzleDatabase } from "../db";

export class Database extends Context.Tag("Database")<Database, DrizzleDatabase>() {}

export const DatabaseLive = (url: string) =>
  Layer.sync(Database, () => {
    return createDatabase(url);
  });
