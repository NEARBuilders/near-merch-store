import type { PluginConfigInput } from 'every-plugin';
import type Plugin from './src/index';
import packageJson from './package.json' with { type: 'json' };
import 'dotenv/config';

export default {
  pluginId: packageJson.name,
  port: 3014,
  config: {
    variables: {
      network: 'mainnet',
      contractId: 'social.near',
    },
    secrets: {
      relayerAccountId: process.env.RELAYER_ACCOUNT_ID!,
      relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY!,
    },
  } satisfies PluginConfigInput<typeof Plugin>,
};
