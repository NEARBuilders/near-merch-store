import bosConfigRaw from '../../bos.config.json';

interface BosConfig {
  account: string;
  app: {
    host: {
      title: string;
      development: string;
      production: string;
    };
    ui: {
      name: string;
      development: string;
      production: string;
      exposes: Record<string, string>;
    };
    api: {
      plugins: Record<
        string,
        {
          development: string;
          production: string;
          variables?: Record<string, any>;
          secrets?: Record<string, string>;
        }
      >;
    };
  };
}

export interface RuntimeConfig {
  env: 'development' | 'production';
  title: string;
  hostUrl: string;
  ui: {
    name: string;
    url: string;
    exposes: Record<string, string>;
  };
  apiPlugins: Record<
    string,
    {
      url: string;
      variables?: Record<string, any>;
      secrets?: Record<string, string>;
    }
  >;
}

export async function loadBosConfig(): Promise<RuntimeConfig> {
  const env = (process.env.NODE_ENV as 'development' | 'production') || 'development';
  const config = bosConfigRaw as BosConfig;

  const useRemoteApi = process.env.USE_REMOTE_API === 'true';
  const useRemoteUi = process.env.USE_REMOTE_UI === 'true';

  const apiPlugins: RuntimeConfig['apiPlugins'] = {};
  for (const [name, pluginConfig] of Object.entries(config.app.api.plugins)) {
    apiPlugins[name] = {
      url: useRemoteApi ? pluginConfig.production : pluginConfig[env],
      variables: pluginConfig.variables,
      secrets: pluginConfig.secrets,
    };
  }

  return {
    env,
    title: config.app.host.title,
    hostUrl: config.app.host[env],
    ui: {
      name: config.app.ui.name,
      url: useRemoteUi ? config.app.ui.production : config.app.ui[env],
      exposes: config.app.ui.exposes,
    },
    apiPlugins,
  };
}
