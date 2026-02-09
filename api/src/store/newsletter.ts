import { eq } from 'drizzle-orm';
import { Context, Effect, Layer } from 'every-plugin/effect';
import * as schema from '../db/schema';
import { Database } from './database';

export type NewsletterSubscribeStatus = 'subscribed' | 'already_subscribed';

export class NewsletterStore extends Context.Tag('NewsletterStore')<
  NewsletterStore,
  {
    readonly subscribe: (email: string) => Effect.Effect<NewsletterSubscribeStatus, Error>;
    readonly isSubscribed: (email: string) => Effect.Effect<boolean, Error>;
  }
>() {}

export const NewsletterStoreLive = Layer.effect(
  NewsletterStore,
  Effect.gen(function* () {
    const db = yield* Database;

    return {
      subscribe: (email) =>
        Effect.tryPromise({
          try: async () => {
            const now = new Date();

            const inserted = await db
              .insert(schema.newsletterSubscriptions)
              .values({
                id: crypto.randomUUID(),
                email,
                active: true,
                createdAt: now,
              })
              .onConflictDoNothing({ target: schema.newsletterSubscriptions.email })
              .returning({ id: schema.newsletterSubscriptions.id });

            return inserted.length > 0 ? 'subscribed' : 'already_subscribed';
          },
          catch: (error) => new Error(`Failed to subscribe newsletter: ${error}`),
        }),

      isSubscribed: (email) =>
        Effect.tryPromise({
          try: async () => {
            const results = await db
              .select({ id: schema.newsletterSubscriptions.id })
              .from(schema.newsletterSubscriptions)
              .where(eq(schema.newsletterSubscriptions.email, email))
              .limit(1);
            return results.length > 0;
          },
          catch: (error) => new Error(`Failed to check newsletter subscription: ${error}`),
        }),
    };
  })
);
