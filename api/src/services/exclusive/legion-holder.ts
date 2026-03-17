import { createPlugin } from 'every-plugin';
import { Effect } from 'every-plugin/effect';
import { z } from 'every-plugin/zod';
import { ExclusiveCheckContract } from './contract';

const LEGION_CONTRACT_IDS = [
  'initiate.nearlegion.near',
  'ascendant.nearlegion.near',
] as const;

const CACHE_TTL_MS = 60_000;

const legionHolderCache = new Map<string, { isHolder: boolean; expiresAt: number }>();

async function viewNear(
  nodeUrl: string,
  contractId: string,
  methodName: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(nodeUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'near-merch-store',
      method: 'query',
      params: {
        request_type: 'call_function',
        finality: 'optimistic',
        account_id: contractId,
        method_name: methodName,
        args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`NEAR RPC request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    error?: { message?: string };
    result?: { result?: number[] };
  };

  if (payload.error) {
    throw new Error(payload.error.message || 'NEAR RPC request failed');
  }

  const rawResult = payload.result?.result;
  if (!Array.isArray(rawResult)) {
    return null;
  }

  const text = Buffer.from(rawResult).toString('utf8');
  return text ? JSON.parse(text) : null;
}

async function checkContract(
  nodeUrl: string,
  accountId: string,
  contractId: string,
): Promise<boolean> {
  try {
    const supply = await viewNear(nodeUrl, contractId, 'nft_supply_for_owner', {
      account_id: accountId,
    });

    if (BigInt(String(supply ?? 0)) > 0n) {
      return true;
    }
  } catch {
    try {
      const tokens = await viewNear(nodeUrl, contractId, 'nft_tokens_for_owner', {
        account_id: accountId,
        from_index: '0',
        limit: 1,
      });

      if (Array.isArray(tokens) && tokens.length > 0) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

const LegionHolderPlugin = createPlugin({
  variables: z.object({
    nodeUrl: z.string().url(),
  }),

  secrets: z.object({}),

  contract: ExclusiveCheckContract,

  initialize: (config) =>
    Effect.gen(function* () {
      console.log('[Legion Holder Plugin] Initialized successfully');
      return {
        nodeUrl: config.variables.nodeUrl,
      };
    }),

  shutdown: () => Effect.void,

  createRouter: (context, builder) => {
    return {
      checkAccess: builder.checkAccess.handler(async ({ input }) => {
        const normalizedAccountId = input.nearAccountId.trim().toLowerCase();
        const cached = legionHolderCache.get(normalizedAccountId);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
          return { hasAccess: cached.isHolder };
        }

        let isHolder = false;

        for (const contractId of LEGION_CONTRACT_IDS) {
          isHolder = await checkContract(context.nodeUrl, normalizedAccountId, contractId);
          if (isHolder) {
            break;
          }
        }

        legionHolderCache.set(normalizedAccountId, {
          isHolder,
          expiresAt: now + CACHE_TTL_MS,
        });

        return { hasAccess: isHolder };
      }),
    };
  },
});

export default LegionHolderPlugin;
