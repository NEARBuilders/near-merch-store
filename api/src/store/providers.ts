import { eq } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import type { ProviderConfig, ProviderName, ProviderWebhookEventType } from '../schema';
import { Database } from './database';

export class ProviderConfigStore extends Context.Tag('ProviderConfigStore')<
  ProviderConfigStore,
  {
    readonly getConfig: (provider: ProviderName) => Effect.Effect<ProviderConfig | null, Error>;
    readonly upsertConfig: (config: {
      provider: ProviderName;
      enabled?: boolean;
      webhookUrl?: string | null;
      webhookUrlOverride?: string | null;
      enabledEvents?: ProviderWebhookEventType[];
      publicKey?: string | null;
      secretKey?: string | null;
      lastConfiguredAt?: number | null;
      expiresAt?: number | null;
    }) => Effect.Effect<ProviderConfig, Error>;
    readonly clearWebhookConfig: (provider: ProviderName) => Effect.Effect<void, Error>;
    readonly getSecretKey: (provider: ProviderName) => Effect.Effect<string | null, Error>;
  }
>() {}

const rowToConfig = (row: typeof schema.providerConfigs.$inferSelect): ProviderConfig => ({
  provider: row.provider as ProviderName,
  enabled: row.enabled,
  webhookUrl: row.webhookUrl,
  webhookUrlOverride: row.webhookUrlOverride,
  enabledEvents: row.enabledEvents ?? [],
  publicKey: row.publicKey,
  secretKey: row.secretKey,
  lastConfiguredAt: row.lastConfiguredAt?.getTime() ?? null,
  expiresAt: row.expiresAt?.getTime() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const ProviderConfigStoreLive = Layer.effect(
  ProviderConfigStore,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      getConfig: (provider) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select()
              .from(schema.providerConfigs)
              .where(eq(schema.providerConfigs.provider, provider))
              .limit(1);

            if (results.length === 0) {
              return null;
            }

            return rowToConfig(results[0]!);
          },
          catch: (error) => new Error(`Failed to get provider config: ${error}`),
        }),

      upsertConfig: (config) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

            const existing = await db
              .select()
              .from(schema.providerConfigs)
              .where(eq(schema.providerConfigs.provider, config.provider))
              .limit(1);

            if (existing.length > 0) {
              const row = existing[0]!;
              await db
                .update(schema.providerConfigs)
                .set({
                  enabled: config.enabled ?? row.enabled,
                  webhookUrl: config.webhookUrl !== undefined ? config.webhookUrl : row.webhookUrl,
                  webhookUrlOverride: config.webhookUrlOverride !== undefined ? config.webhookUrlOverride : row.webhookUrlOverride,
                  enabledEvents: config.enabledEvents ?? row.enabledEvents,
                  publicKey: config.publicKey !== undefined ? config.publicKey : row.publicKey,
                  secretKey: config.secretKey !== undefined ? config.secretKey : row.secretKey,
                  lastConfiguredAt: config.lastConfiguredAt !== undefined
                    ? (config.lastConfiguredAt ? new Date(config.lastConfiguredAt) : null)
                    : row.lastConfiguredAt,
                  expiresAt: config.expiresAt !== undefined
                    ? (config.expiresAt ? new Date(config.expiresAt) : null)
                    : row.expiresAt,
                  updatedAt: now,
                })
                .where(eq(schema.providerConfigs.provider, config.provider));
            } else {
              await db.insert(schema.providerConfigs).values({
                provider: config.provider,
                enabled: config.enabled ?? false,
                webhookUrl: config.webhookUrl ?? null,
                webhookUrlOverride: config.webhookUrlOverride ?? null,
                enabledEvents: config.enabledEvents ?? null,
                publicKey: config.publicKey ?? null,
                secretKey: config.secretKey ?? null,
                lastConfiguredAt: config.lastConfiguredAt ? new Date(config.lastConfiguredAt) : null,
                expiresAt: config.expiresAt ? new Date(config.expiresAt) : null,
                createdAt: now,
                updatedAt: now,
              });
            }

            const results = await db
              .select()
              .from(schema.providerConfigs)
              .where(eq(schema.providerConfigs.provider, config.provider))
              .limit(1);

            return rowToConfig(results[0]!);
          },
          catch: (error) => new Error(`Failed to upsert provider config: ${error}`),
        }),

      clearWebhookConfig: (provider) =>
        Effect.tryPromise({
          try: async () => {
            await db
              .update(schema.providerConfigs)
              .set({
                webhookUrl: null,
                enabledEvents: null,
                publicKey: null,
                secretKey: null,
                lastConfiguredAt: null,
                expiresAt: null,
                updatedAt: new Date(),
              })
              .where(eq(schema.providerConfigs.provider, provider));
          },
          catch: (error) => new Error(`Failed to clear webhook config: ${error}`),
        }),

      getSecretKey: (provider) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select({ secretKey: schema.providerConfigs.secretKey })
              .from(schema.providerConfigs)
              .where(eq(schema.providerConfigs.provider, provider))
              .limit(1);

            return results[0]?.secretKey ?? null;
          },
          catch: (error) => new Error(`Failed to get secret key: ${error}`),
        }),
    };
  })
);
