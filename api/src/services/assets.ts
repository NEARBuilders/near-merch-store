import { Context, Effect, Layer } from 'every-plugin/effect';
import { AssetStore, type Asset } from '../store/assets';
import { generateProductId } from '../utils/product-ids';

export class AssetService extends Context.Tag('AssetService')<
  AssetService,
  {
    readonly create: (input: {
      url: string;
      type: string;
      name?: string;
      metadata?: Record<string, unknown>;
    }) => Effect.Effect<Asset, Error>;
    readonly get: (id: string) => Effect.Effect<Asset, Error>;
    readonly list: (options?: {
      type?: string;
      limit?: number;
      offset?: number;
    }) => Effect.Effect<{ assets: Asset[]; total: number }, Error>;
    readonly update: (
      id: string,
      data: {
        url?: string;
        name?: string;
        metadata?: Record<string, unknown>;
      },
    ) => Effect.Effect<Asset | null, Error>;
    readonly delete: (id: string) => Effect.Effect<void, Error>;
  }
>() {}

export const AssetServiceLive = Layer.effect(
  AssetService,
  Effect.gen(function* () {
    const store = yield* AssetStore;

    return {
      create: (input) =>
        Effect.gen(function* () {
          const id = generateProductId();
          return yield* store.create({
            id,
            url: input.url,
            type: input.type,
            name: input.name,
            metadata: input.metadata,
          });
        }),

      get: (id) =>
        Effect.gen(function* () {
          const asset = yield* store.find(id);
          if (!asset) {
            return yield* Effect.fail(new Error(`Asset not found: ${id}`));
          }
          return asset;
        }),

      list: (options) => store.findMany(options),

      update: (id, data) => store.update(id, data),

      delete: (id) => store.delete(id),
    };
  }),
);
