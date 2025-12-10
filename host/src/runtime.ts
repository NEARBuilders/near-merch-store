import { createPluginRuntime } from 'every-plugin';
import fs from 'node:fs';
import path from 'node:path';

interface PluginEntry {
  remote?: string;
  module?: any;
  variables?: Record<string, any>;
  secrets?: Record<string, string>;
}

interface RegistryConfig {
  plugins: Record<string, PluginEntry>;
}

export interface PluginStatus {
  available: boolean;
  pluginName: string | null;
  error: string | null;
  errorDetails: string | null;
}

const registryPath = path.resolve(import.meta.dirname, '../registry.json');
const registry: RegistryConfig = JSON.parse(
  fs.readFileSync(registryPath, 'utf-8')
);

function resolveSecrets(
  secrets: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(secrets)) {
    const match = value.match(/^\{\{(\w+)\}\}$/);
    if (match) {
      resolved[key] = process.env[match[1]] ?? '';
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

export interface PluginResult {
  runtime: ReturnType<typeof createPluginRuntime> | null;
  api: any | null;
  status: PluginStatus;
}

export async function initializePlugins(): Promise<PluginResult> {
  const entries = Object.entries(registry.plugins);
  if (entries.length === 0) {
    console.warn('[Plugins] No plugins configured in registry.json');
    return {
      runtime: null,
      api: null,
      status: {
        available: false,
        pluginName: null,
        error: 'No plugins configured',
        errorDetails: 'No plugins found in registry.json',
      },
    };
  }

  const [pluginName, pluginConfig] = entries[0]!;

  const runtime = createPluginRuntime({
    registry: {
      [pluginName]: {
        remote: pluginConfig.remote,
        module: pluginConfig.module,
      },
    },
    secrets: {},
  });

  const secrets = pluginConfig.secrets
    ? resolveSecrets(pluginConfig.secrets)
    : {};
  const variables = pluginConfig.variables ?? {};

  try {
    const api = await runtime.usePlugin(pluginName, {
      variables,
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
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[Plugins] Failed to load plugin "${pluginName}":`, error);
    console.warn('[Plugins] Server will continue without plugin functionality');

    return {
      runtime: null,
      api: null,
      status: {
        available: false,
        pluginName,
        error: errorMessage,
        errorDetails: errorStack ?? null,
      },
    };
  }
}

export type Plugins = Awaited<ReturnType<typeof initializePlugins>>;
