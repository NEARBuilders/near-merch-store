# marketplace-api

[every-plugin](https://github.com/near-everything/every-plugin) based API for marketplace operations.

## Plugin Architecture

Built with **every-plugin** framework (Rspack + Module Federation):

```
┌─────────────────────────────────────────────────────────┐
│                    createPlugin()                       │
├─────────────────────────────────────────────────────────┤
│  variables: { network, contractId, ... }                │
│  secrets: { STRIPE_SECRET_KEY, PRINTFUL_API_KEY, ... }  │
│  contract: oRPC route definitions                       │
│  initialize(): Effect → services                        │
│  createRouter(): handlers using services                │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Host Integration                      │
├─────────────────────────────────────────────────────────┤
│  registry.json → plugin URL + secrets                   │
│  runtime.ts → createPluginRuntime().usePlugin()         │
│  routers/index.ts → merge plugin.router into AppRouter  │
└─────────────────────────────────────────────────────────┘
```

**Plugin Structure:**

- `contract.ts` - oRPC contract definition (routes, schemas)
- `index.ts` - Plugin initialization + router handlers
- `schema.ts` - Zod schemas for input/output validation
- `services/` - Business logic (products, orders, stripe, fulfillment)
- `db/` - Database schema and migrations

**Extending with more plugins:**

Each domain can be its own plugin with independent:

- Contract definition
- Initialization logic  
- Router handlers
- Database schema

## API Endpoints

**Products** - Product catalog from Printful

- `GET /products` - List products
- `GET /products/{id}` - Get product
- `GET /products/search` - Search products
- `GET /products/featured` - Featured products

**Collections**

- `GET /collections` - List collections
- `GET /collections/{slug}` - Get collection with products

**Checkout & Orders**

- `POST /checkout` - Create Stripe checkout session
- `GET /orders` - List user orders
- `GET /orders/{id}` - Get order details

**Sync** - Product sync from fulfillment providers

- `POST /sync` - Trigger product sync
- `GET /sync-status` - Check sync status

**Relayer** - NEAR meta-transactions

- `POST /connect` - Ensure storage deposit
- `POST /publish` - Submit delegate action

**Webhooks**

- `POST /webhooks/stripe` - Stripe payment events
- `POST /webhooks/fulfillment` - Gelato/Printful fulfillment events

## Tech Stack

- **Framework**: every-plugin + oRPC
- **Effects**: Effect-TS for service composition
- **Database**: SQLite (libsql) + Drizzle ORM
- **Payments**: Stripe
- **Fulfillment**: Printful, Gelato
- **NEAR**: near-kit + near-social-js

## Available Scripts

- `bun dev` - Start dev server
- `bun build` - Build plugin
- `bun test` - Run tests
- `bun db:push` - Push schema to database
- `bun db:studio` - Open Drizzle Studio

## Configuration

**Host registry** (`host/registry.json`):

```json
{
  "plugins": {
    "marketplace-api": {
      "remote": "https://...",
      "secrets": {
        "STRIPE_SECRET_KEY": "{{STRIPE_SECRET_KEY}}",
        "PRINTFUL_API_KEY": "{{PRINTFUL_API_KEY}}"
      }
    }
  }
}
```

**Required Secrets:**

- `STRIPE_SECRET_KEY` - Stripe API key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `PRINTFUL_API_KEY` - Printful API key
- `GELATO_API_KEY` - Gelato API key
- `DATABASE_URL` - SQLite database URL
