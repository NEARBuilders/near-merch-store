const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function waitForJson<T>(options: {
  url: string;
  timeoutMs?: number;
  intervalMs?: number;
  predicate: (data: T) => boolean;
}): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 45_000;
  const intervalMs = options.intervalMs ?? 250;
  const start = Date.now();
  let lastError: unknown = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(options.url, {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
      } else {
        const data = (await res.json()) as T;
        if (options.predicate(data)) return data;
      }
    } catch (e) {
      lastError = e;
    }
    await sleep(intervalMs);
  }

  throw new Error(
    `Timed out waiting for ${options.url}${lastError ? ` (last error: ${String((lastError as any)?.message ?? lastError)})` : ""}`,
  );
}
