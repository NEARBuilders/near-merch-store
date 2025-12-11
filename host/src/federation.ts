import { registerRemotes } from '@module-federation/enhanced/runtime';
import { loadBosConfig, type RuntimeConfig } from './config';

let runtimeConfig: RuntimeConfig | null = null;

export function getRuntimeConfig() {
  if (!runtimeConfig) {
    throw new Error('Runtime config not initialized');
  }
  return runtimeConfig;
}

export async function initializeFederation() {
  const config = await loadBosConfig();
  runtimeConfig = config;
  
  console.log('[Federation] Registering dynamic remote:', {
    name: config.ui.name,
    entry: `${config.ui.url}/remoteEntry.js`,
    alias: config.ui.name,
  });

  registerRemotes([
    {
      name: config.ui.name,
      entry: `${config.ui.url}/remoteEntry.js`,
      alias: config.ui.name,
    },
  ]);

  return config;
}
