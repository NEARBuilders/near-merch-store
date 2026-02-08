import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { waitForJson } from "./http";

export interface ApiDevServerHandle {
  port: number;
  baseUrl: string;
  rpcUrl: string;
  apiUrl: string;
  process: ChildProcess;
  logs: string[];
  stop: () => Promise<void>;
}

export function getFederationVersionMismatchLines(logs: string[]): string[] {
  return logs.filter(
    (l) =>
      l.includes("Federation Runtime") &&
      (l.includes("does not satisfy") || l.includes("catalog:")),
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function startApiDevServer(options: {
  repoRoot: string;
  apiPort?: number;
  env?: Record<string, string | undefined>;
  startupTimeoutMs?: number;
}): Promise<ApiDevServerHandle> {
  const port = options.apiPort ?? 3014; // api/plugin.dev.ts
  const apiDir = resolve(options.repoRoot, "api");

  const proc = spawn("bun", ["run", "dev"], {
    cwd: apiDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ...options.env,
      NODE_ENV: "development",
    },
  });

  const logs: string[] = [];
  const push = (prefix: string, data: Buffer) => {
    const lines = data.toString().split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      logs.push(`${prefix}: ${line}`);
    }
  };
  proc.stdout.on("data", (d) => push("STDOUT", d));
  proc.stderr.on("data", (d) => push("STDERR", d));

  const baseUrl = `http://localhost:${port}`;

  await waitForJson<{ status?: string }>(
    {
      url: `${baseUrl}/`,
      timeoutMs: options.startupTimeoutMs ?? 90_000,
      predicate: (data) => data?.status === "ready",
    },
  );

  // Give rspack a beat to settle after ready
  await sleep(250);

  const stop = async () => {
    proc.kill("SIGTERM");
    // best effort wait
    await new Promise<void>((resolve) => {
      const t = setTimeout(() => resolve(), 10_000);
      proc.on("exit", () => {
        clearTimeout(t);
        resolve();
      });
    });
  };

  return {
    port,
    baseUrl,
    rpcUrl: `${baseUrl}/api/rpc`,
    apiUrl: `${baseUrl}/api`,
    process: proc,
    logs,
    stop,
  };
}
