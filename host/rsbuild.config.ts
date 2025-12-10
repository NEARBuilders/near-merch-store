import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import fs from 'node:fs';
import pkg from './package.json';

const remotesConfig = JSON.parse(fs.readFileSync('./remotes.json', 'utf-8'));

const remoteEntries = Object.entries(remotesConfig.remotes).reduce(
  (acc, [name, config]) => {
    const { url } = config as { url: string };
    acc[name] = `${name}@${url}/remoteEntry.js`;
    return acc;
  },
  {} as Record<string, string>
);

const remoteEntryUrl = remotesConfig.remotes.marketplace_ui?.url ?? '';
const remoteOrigin = remoteEntryUrl ? new URL(remoteEntryUrl).origin : '';

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'host',
      remotes: remoteEntries,
      dts: false,
      shared: {
        react: {
          singleton: true,
          eager: true,
          requiredVersion: pkg.dependencies.react,
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: pkg.dependencies['react-dom'],
        },
        '@tanstack/react-query': {
          singleton: true,
          eager: true,
          requiredVersion: pkg.dependencies['@tanstack/react-query'],
        },
        '@tanstack/react-router': {
          singleton: true,
          eager: true,
          requiredVersion: pkg.dependencies['@tanstack/react-router'],
        },
        '@hot-labs/near-connect': {
          singleton: true,
          eager: false,
          requiredVersion: pkg.dependencies['@hot-labs/near-connect'],
        },
        'near-kit': {
          singleton: true,
          eager: false,
          requiredVersion: pkg.dependencies['near-kit'],
        },
      },
    }),
  ],
  source: {
    entry: {
      index: './src/index.client.tsx',
    },
  },
  html: {
    template: './index.html',
    templateParameters: {
      remoteOrigin,
      remoteEntryUrl,
    },
  },
  server: {
    port: 3001,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
    assetPrefix: 'auto',
  },
});
