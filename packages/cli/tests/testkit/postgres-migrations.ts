import { readFile } from "node:fs/promises";
import { exec } from "./process";

export async function applyPostgresSqlFile(options: {
  containerId: string;
  db: string;
  user: string;
  sqlFilePath: string;
}): Promise<void> {
  const sql = await readFile(options.sqlFilePath, "utf8");

  const runOnce = async () =>
    exec(
      "docker",
      [
        "exec",
        "-i",
        options.containerId,
        "psql",
        "-v",
        "ON_ERROR_STOP=1",
        "-U",
        options.user,
        "-d",
        options.db,
      ],
      { stdin: sql, timeoutMs: 120_000 },
    );

  const res1 = await runOnce();
  if (res1.code === 0) return;

  const msg = (res1.stderr || res1.stdout || "").toLowerCase();
  if (msg.includes("system is starting up") || msg.includes("system is shutting down")) {
    // transient during container init/restart
    await new Promise((r) => setTimeout(r, 800));
    const res2 = await runOnce();
    if (res2.code === 0) return;
    throw new Error(`Failed to apply migrations (after retry):\n${res2.stderr || res2.stdout}`);
  }

  throw new Error(`Failed to apply migrations:\n${res1.stderr || res1.stdout}`);
}

export async function psql(options: {
  containerId: string;
  db: string;
  user: string;
  sql: string;
}): Promise<void> {
  const res = await exec(
    "docker",
    [
      "exec",
      "-i",
      options.containerId,
      "psql",
      "-v",
      "ON_ERROR_STOP=1",
      "-U",
      options.user,
      "-d",
      options.db,
      "-c",
      options.sql,
    ],
    { timeoutMs: 60_000 },
  );
  if (res.code !== 0) {
    throw new Error(`psql failed:\n${res.stderr || res.stdout}`);
  }
}
