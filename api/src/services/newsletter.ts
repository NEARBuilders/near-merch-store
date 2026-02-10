import { Context, Effect, Layer } from 'every-plugin/effect';
import { NewsletterStore, type NewsletterSubscribeStatus } from '../store/newsletter';

export class NewsletterService extends Context.Tag('NewsletterService')<
  NewsletterService,
  {
    readonly subscribe: (email: string) => Effect.Effect<{ status: NewsletterSubscribeStatus }, Error>;
  }
>() {}

export const NewsletterServiceLive = Layer.effect(
  NewsletterService,
  Effect.gen(function* () {
    const store = yield* NewsletterStore;

    return {
      subscribe: (email) =>
        Effect.gen(function* () {
          const normalized = email.trim().toLowerCase();
          const status = yield* store.subscribe(normalized);
          return { status };
        }),
    };
  })
);
