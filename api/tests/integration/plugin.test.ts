import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createPluginRuntime } from 'every-plugin';
import { Near, generateKey, type PrivateKey } from 'near-kit';
import { Social } from 'near-social-js';
import {
  createTestSandbox,
  stopTestSandbox,
  type TestContext,
} from '../../../../test/setup';
import Plugin from '../../src/index';

let ctx: TestContext;
let pluginRuntime: ReturnType<typeof createPluginRuntime>;
let relayerAccountId: string;
let relayerPrivateKey: string;
let userAccountId: string;
let userNear: Near;
let userSocial: Social;
let sandboxRpcUrl: string;

beforeAll(async () => {
  ctx = await createTestSandbox('social');
  const { near, sandbox, contractId, rootAccountId } = ctx;
  sandboxRpcUrl = sandbox.rpcUrl;

  const relayerKey = generateKey();
  relayerAccountId = `relayer.${rootAccountId}`;
  relayerPrivateKey = relayerKey.secretKey;

  await near
    .transaction(rootAccountId)
    .createAccount(relayerAccountId)
    .transfer(relayerAccountId, '20 NEAR')
    .addKey(relayerKey.publicKey.toString(), { type: 'fullAccess' })
    .send();

  const userKey = generateKey();
  userAccountId = `user.${rootAccountId}`;

  await near
    .transaction(rootAccountId)
    .createAccount(userAccountId)
    .transfer(userAccountId, '10 NEAR')
    .addKey(userKey.publicKey.toString(), { type: 'fullAccess' })
    .send();

  userNear = new Near({
    network: sandbox,
    privateKey: userKey.secretKey as PrivateKey,
    defaultSignerId: userAccountId,
    defaultWaitUntil: 'FINAL',
  });

  userSocial = new Social({
    near: userNear,
    contractId,
    useApiServer: false,
  });

  pluginRuntime = createPluginRuntime({
    registry: {
      'near-social-js-relayer': {
        module: Plugin,
      },
    },
    secrets: {
      RELAYER_ACCOUNT_ID: relayerAccountId,
      RELAYER_PRIVATE_KEY: relayerPrivateKey,
    },
  });
}, 120000);

afterAll(async () => {
  if (pluginRuntime) {
    await pluginRuntime.shutdown();
  }
  await stopTestSandbox(ctx);
});

describe('Relayer Plugin Integration Tests', () => {
  describe('ping procedure', () => {
    it('should return healthy status', async () => {
      const { client } = await pluginRuntime.usePlugin(
        'near-social-js-relayer',
        {
          variables: {
            network: 'testnet',
            contractId: ctx.contractId,
            nodeUrl: sandboxRpcUrl,
          },
          secrets: {
            relayerAccountId: '{{RELAYER_ACCOUNT_ID}}',
            relayerPrivateKey: '{{RELAYER_PRIVATE_KEY}}',
          },
        }
      );

      const result = await client.ping();

      expect(result).toEqual({
        status: 'ok',
        timestamp: expect.any(String),
      });
    });
  });

  describe('connect procedure', () => {
    it('should ensure storage deposit for a new account', async () => {
      const { client } = await pluginRuntime.usePlugin(
        'near-social-js-relayer',
        {
          variables: {
            network: 'testnet',
            contractId: ctx.contractId,
            nodeUrl: sandboxRpcUrl,
          },
          secrets: {
            relayerAccountId: '{{RELAYER_ACCOUNT_ID}}',
            relayerPrivateKey: '{{RELAYER_PRIVATE_KEY}}',
          },
        }
      );

      const result = await client.connect({ accountId: userAccountId });

      expect(result.accountId).toBe(userAccountId);
      expect(typeof result.hasStorage).toBe('boolean');
      if (!result.hasStorage) {
        expect(result.depositTxHash).toBeDefined();
      }
    });
  });

  describe('publish procedure', () => {
    it('should relay a signed delegate action for profile update', async () => {
      const { client } = await pluginRuntime.usePlugin(
        'near-social-js-relayer',
        {
          variables: {
            network: 'testnet',
            contractId: ctx.contractId,
            nodeUrl: sandboxRpcUrl,
          },
          secrets: {
            relayerAccountId: '{{RELAYER_ACCOUNT_ID}}',
            relayerPrivateKey: '{{RELAYER_PRIVATE_KEY}}',
          },
        }
      );

      await client.connect({ accountId: userAccountId });

      const txBuilder = await userSocial.setProfile(userAccountId, {
        name: 'Relayed User',
        description: 'Profile set via relayer',
      });

      const { payload } = await txBuilder.delegate();

      const result = await client.publish({ payload });

      expect(result.hash).toBeDefined();
      expect(typeof result.hash).toBe('string');

      const profile = await userSocial.getProfile(userAccountId);
      expect(profile?.name).toBe('Relayed User');
      expect(profile?.description).toBe('Profile set via relayer');
    });
  });
});
