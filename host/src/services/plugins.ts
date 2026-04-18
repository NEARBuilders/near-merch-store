import { createPluginRuntime } from "every-plugin";
import { Context, Effect, Layer } from "every-plugin/effect";
import type { RuntimeConfig } from 'everything-dev/types';
import { ConfigService } from "./config";
import { PluginError } from "./errors";

export interface PluginStatus {
  available: boolean;
  pluginName: string | null;
  error: string | null;
  errorDetails: string | null;
}

export interface PluginResult {
  runtime: ReturnType<typeof createPluginRuntime> | null;
  api: unknown;
  status: PluginStatus;
}

function secretsFromEnv(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === "string" && v.length > 0) out[k] = v;
  }
  return out;
}

function stripEmptyStrings<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== "") result[key] = value;
  }
  return result;
}

const unavailableResult = (
  pluginName: string | null,
  error: string | null,
  errorDetails: string | null
): PluginResult => ({
  runtime: null,
  api: null,
  status: { available: false, pluginName, error, errorDetails },
});

function extractErrorMessage(error: unknown): string {
		if (error instanceof Error) return error.message;
		if (error && typeof error === "object") {
			if ("message" in error && typeof error.message === "string" && error.message) return error.message;
			if ("cause" in error && error.cause instanceof Error) return error.cause.message;
			if ("_tag" in error && typeof error._tag === "string") return `Plugin error: ${error._tag}`;
			try { return JSON.stringify(error); } catch { /* fall through */ }
		}
		return String(error) || "Unknown error";
	}

export const initializePlugins = Effect.gen(function* () {
  const config: RuntimeConfig = yield* ConfigService;
  const pluginConfig = config.api;
  const pluginName = pluginConfig.name;
  const pluginUrl = pluginConfig.url;

  if (pluginConfig.proxy) {
    console.log(`[Plugins] Proxy mode enabled, skipping plugin initialization`);
    console.log(`[Plugins] API requests will be proxied to: ${pluginConfig.proxy}`);
    return {
      runtime: null,
      api: null,
      status: { available: false, pluginName, error: null, errorDetails: null },
    } satisfies PluginResult;
  }

  console.log(`[Plugins] Registering remote: ${pluginName} from ${pluginUrl}`);

  const result = yield* Effect.tryPromise({
    try: async () => {
      const runtime = createPluginRuntime({
        registry: {
          [pluginName]: {
            remote: pluginUrl,
          },
        },
        secrets: {},
      });

      const secrets = pluginConfig.secrets ? secretsFromEnv(pluginConfig.secrets) : {};
      const variables = stripEmptyStrings(pluginConfig.variables ?? {});

      const api = await runtime.usePlugin(pluginName, {
        // @ts-expect-error no plugin types loaded
        variables,
        // @ts-expect-error no plugin types loaded
        secrets,
      });

      return {
        runtime,
        api,
        status: {
          available: true,
          pluginName,
          error: null,
          errorDetails: null,
        },
      } satisfies PluginResult;
    },
    catch: (error) =>
      new PluginError({
        pluginName,
        pluginUrl,
        cause: error,
      }),
  });

  return result;
}).pipe(
  Effect.catchAll((error) => {
    const pluginName = error instanceof PluginError ? error.pluginName : null;
    const pluginUrl = error instanceof PluginError ? error.pluginUrl : null;
    const errorMessage = extractErrorMessage(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    const causeMessage = error instanceof PluginError && error.cause ? ` | Caused by: ${extractErrorMessage(error.cause)}` : "";

    console.error("[Plugins] ❌ Failed to initialize plugin");
    console.error(`[Plugins] Plugin: ${pluginName}`);
    console.error(`[Plugins] URL: ${pluginUrl}`);
    console.error(`[Plugins] Error: ${errorMessage}${causeMessage}`);
    console.warn("[Plugins] Server will continue without plugin functionality");

    return Effect.succeed(unavailableResult(pluginName ?? null, `${errorMessage}${causeMessage}`, errorStack ?? null));
  })
);

export class PluginsService extends Context.Tag("host/PluginsService")<
  PluginsService,
  PluginResult
>() {
  static Live = Layer.scoped(
    PluginsService,
    Effect.gen(function* () {
      const plugins = yield* initializePlugins;

      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          if (plugins.runtime) {
            console.log("[Plugins] Shutting down plugin runtime...");
            plugins.runtime.shutdown();
          }
        })
      );

      return plugins;
    })
  );
}
