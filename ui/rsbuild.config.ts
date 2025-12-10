import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { TanStackRouterRspack } from '@tanstack/router-plugin/rspack';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pkg from './package.json';
import { withZephyr } from 'zephyr-rsbuild-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const normalizedName = pkg.name;

function updateHostConfig(name: string, url: string) {
  try {
    const configPath = path.resolve(__dirname, '../host/remotes.json');
    const json = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    json.remotes[name].url = url;
    fs.writeFileSync(configPath, JSON.stringify(json, null, 2) + '\n');
    console.log('   ✅ Updated host/remotes.json');
  } catch (err) {
    console.error(
      '   ❌ Failed to update host/remotes.json:',
      (err as Error).message
    );
  }
}

export default defineConfig({
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: normalizedName,
      filename: 'remoteEntry.js',
      dts: false,
      exposes: {
        './App': './src/bootstrap.tsx',
        './Router': './src/router.tsx',
        './components': './src/components/index.ts',
        './providers': './src/providers/index.tsx',
        './types': './src/types/index.ts',
      },
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
          eager: true,
          requiredVersion: pkg.dependencies['@hot-labs/near-connect'],
        },
        'near-kit': {
          singleton: true,
          eager: true,
          requiredVersion: pkg.dependencies['near-kit'],
        },
      },
    }),
    withZephyr({
      hooks: {
        onDeployComplete: (info) => {
          console.log('🚀 Deployment Complete!');
          console.log(`   URL: ${info.url}`);
          console.log(`   Module: ${info.snapshot.uid.app_name}`);
          console.log(`   Build ID: ${info.snapshot.uid.build}`);
          console.log(`   Dependencies: ${info.federatedDependencies.length}`);
          console.log(
            `   Git: ${info.snapshot.git.branch}@${info.snapshot.git.commit}`
          );
          console.log(`   CI: ${info.buildStats.context.isCI ? 'Yes' : 'No'}`);
          updateHostConfig(normalizedName, info.url);
        },
      },
    }),
  ],
  source: {
    entry: {
      index: './src/main.tsx',
      remote: './src/remote.tsx',
    },
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
  html: {
    template: './index.html',
  },
  dev: {
    lazyCompilation: false,
  },
  server: {
    port: 3000,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  },
  tools: {
    rspack: {
      target: 'web',
      output: {
        library: {
          name: normalizedName,
          type: 'var',
        },
      },
      externalsType: 'module',
      externals: {
        fs: 'commonjs fs',
        path: 'commonjs path',
        crypto: 'commonjs crypto',
        'node:fs': 'commonjs node:fs',
        'node:fs/promises': 'commonjs node:fs/promises',
        'node:path': 'commonjs node:path',
        'node:crypto': 'commonjs node:crypto',
      },
      plugins: [
        TanStackRouterRspack({
          target: 'react',
          autoCodeSplitting: true,
        }),
      ],
    },
  },
  output: {
    assetPrefix: 'auto',
    filename: {
      css: 'static/css/[name].css',
    },
  },
});
