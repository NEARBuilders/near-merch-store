import { spawn } from "node:child_process";

export interface ExecResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  stdin?: string;
  timeoutMs?: number;
}

export const exec = (
  command: string,
  args: string[] = [],
  options: ExecOptions = {},
): Promise<ExecResult> => {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });

    let stdout = "";
    let stderr = "";

    const timeout = options.timeoutMs
      ? setTimeout(() => {
          proc.kill("SIGKILL");
          reject(new Error(`Command timed out: ${command} ${args.join(" ")}`));
        }, options.timeoutMs)
      : null;

    proc.stdout?.on("data", (d: Buffer) => {
      stdout += d.toString();
    });
    proc.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    proc.on("error", (e) => {
      if (timeout) clearTimeout(timeout);
      reject(e);
    });
    proc.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 0, stdout, stderr });
    });

    if (options.stdin) {
      proc.stdin?.write(options.stdin);
    }
    proc.stdin?.end();
  });
};
