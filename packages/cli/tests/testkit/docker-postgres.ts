import { randomUUID } from "node:crypto";
import { exec } from "./process";

export interface PostgresHandle {
  containerId: string;
  port: number;
  databaseUrl: string;
  stop: () => Promise<void>;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startDockerPostgres(options?: {
  image?: string;
  user?: string;
  password?: string;
  db?: string;
  startupTimeoutMs?: number;
}): Promise<PostgresHandle> {
  const image = options?.image ?? "postgres:16-alpine";
  const user = options?.user ?? "postgres";
  const password = options?.password ?? "postgres";
  const db = options?.db ?? "api";
  const startupTimeoutMs = options?.startupTimeoutMs ?? 45_000;

  const name = `near-merch-test-pg-${randomUUID().slice(0, 8)}`;

  // Random host port: "-p 0:5432" then inspect via `docker port`
  const run = await exec(
    "docker",
    [
      "run",
      "--rm",
      "-d",
      "--name",
      name,
      "-e",
      `POSTGRES_USER=${user}`,
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "-e",
      `POSTGRES_DB=${db}`,
      "-p",
      "0:5432",
      image,
    ],
    { timeoutMs: 60_000 },
  );

  if (run.code !== 0) {
    throw new Error(`Failed to start Postgres container:\n${run.stderr || run.stdout}`);
  }

  const containerId = run.stdout.trim();

  const stop = async () => {
    await exec("docker", ["stop", containerId], { timeoutMs: 30_000 });
  };

  // Resolve mapped port
  const portRes = await exec("docker", ["port", containerId, "5432/tcp"], {
    timeoutMs: 30_000,
  });
  if (portRes.code !== 0) {
    await stop();
    throw new Error(`Failed to resolve mapped Postgres port:\n${portRes.stderr || portRes.stdout}`);
  }

  // output: 0.0.0.0:49154 or :::49154
  const portLine = portRes.stdout.trim().split("\n")[0] ?? "";
  const portStr = portLine.split(":").pop() ?? "";
  const port = Number.parseInt(portStr, 10);
  if (!Number.isFinite(port)) {
    await stop();
    throw new Error(`Could not parse Postgres port from: ${portLine}`);
  }

  // Wait for readiness
  const start = Date.now();
  while (Date.now() - start < startupTimeoutMs) {
    const ready = await exec(
      "docker",
      ["exec", containerId, "pg_isready", "-U", user, "-d", db],
      { timeoutMs: 10_000 },
    );
    if (ready.code === 0) {
      // Postgres containers can briefly report ready during init and then restart.
      // Require a second ready check to avoid flakiness.
      await sleep(500);
      const ready2 = await exec(
        "docker",
        ["exec", containerId, "pg_isready", "-U", user, "-d", db],
        { timeoutMs: 10_000 },
      );
      if (ready2.code === 0) {
        const databaseUrl = `postgres://${user}:${password}@localhost:${port}/${db}`;
        return { containerId, port, databaseUrl, stop };
      }
    }
    await sleep(300);
  }

  await stop();
  throw new Error(`Postgres container did not become ready within ${startupTimeoutMs}ms`);
}
