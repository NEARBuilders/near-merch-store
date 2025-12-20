# everything.market

Server host for the marketplace with authentication and Module Federation.

## Architecture

The host orchestrates two federation systems:

```
┌─────────────────────────────────────────────────────────┐
│                        host                             │
│                                                         │
│  ┌────────────────────────────────────────────────┐     │
│  │                  server.ts                     │     │
│  │  Hono.js + oRPC handlers                       │     │
│  └────────────────────────────────────────────────┘     │
│           ↑                         ↑                   │
│  ┌────────┴────────┐       ┌────────┴────────┐          │
│  │ bos.config.json │       │ bos.config.json │          │
│  │ UI Federation   │       │ API Plugins     │          │
│  └────────┬────────┘       └────────┬────────┘          │
│           ↓                         ↓                   │
│  ┌─────────────────┐       ┌─────────────────┐          │
│  │ Module Fed      │       │ every-plugin    │          │
│  │ runtime         │       │ runtime         │          │
│  └─────────────────┘       └─────────────────┘          │
│           ↓                         ↓                   │
│  ┌─────────────────┐       ┌─────────────────┐          │
│  │ React app       │       │ oRPC router     │          │
│  │ (SSR/CSR)       │       │ (merged)        │          │
│  └─────────────────┘       └─────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

## Federation

**UI Remotes** (`bos.config.json`):

```json
{
  "ui": {
    "name": "ui",
    "development": "http://localhost:3002",
    "production": "https://...",
    "exposes": {
      "App": "./App",
      "components": "./components",
      "providers": "./providers",
      "types": "./types"
    }
  }
}
```

**API Plugins** (`bos.config.json`):

```json
{
  "api": {
    "name": "api",
    "development": "http://localhost:3014",
    "production": "https://...",
    "variables": {
      "network": "mainnet",
      "contractId": "social.near"
    },
    "secrets": [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "PRINTFUL_API_KEY",
      "PRINTFUL_STORE_ID",
      "API_DATABASE_URL",
      "API_DATABASE_AUTH_TOKEN"
    ]
  }
}
```

**Router Composition** (`routers/index.ts`):

```typescript
return {
  ...baseRouter,           // /health, /status
  ...plugins.api.router,   // plugin routes
}
```

## Tech Stack

- **Server**: Hono.js + @hono/node-server
- **API**: oRPC (RPC + OpenAPI)
- **Auth**: Better-Auth + better-near-auth
- **Database**: SQLite (libsql) + Drizzle ORM
- **Build**: Rsbuild + Module Federation
- **Plugins**: every-plugin runtime

## Available Scripts

- `bun dev` - Start dev server (API: 3000, UI: 3001)
- `bun build` - Build for production
- `bun preview` - Run production server
- `bun db:migrate` - Run migrations
- `bun db:studio` - Open Drizzle Studio

## API Routes

- `/api/auth/*` - Authentication endpoints (Better-Auth)
- `/api/rpc/*` - RPC endpoint (batching supported)
- `/api/*` - REST API (OpenAPI spec)
- `/health` - Health check
