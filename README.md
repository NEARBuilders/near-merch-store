<!-- markdownlint-disable MD014 -->
<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD041 -->
<!-- markdownlint-disable MD029 -->

<div align="center">

<img src="./ui/public/metadata.png" alt="nearmerch.com" width="100%" />
<h1 style="font-size: 2.5rem; font-weight: bold;">NEAR Protocol Merch Store</h1>
  <p>
    <strong>A production-ready e-commerce marketplace powered by NEAR Protocol, demonstrating print-on-demand fulfillment with Module Federation architecture.</strong>
  </p>

  <p>
    <a href="https://x.com/nearmerch" target="_blank"><strong>🐦 Twitter</strong></a> •
    <a href="https://t.me/nearmerch" target="_blank"><strong>💬 Telegram</strong></a>
  </p>

  <a href="https://near.org">
    <img src="https://img.shields.io/badge/Built_on-NEAR-000000?style=for-the-badge&logo=near&logoColor=white" alt="Built on NEAR" />
  </a>

</div>

## Quick Start

```bash
bun install       # Install dependencies
bun db:migrate    # Run database migrations
bun dev           # Start all services (API, UI, Host)
```

Visit <http://localhost:3000> to see the application.

## Documentation

- **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Contribution guidelines and development workflow
- **[API README](./api/README.md)** - API plugin documentation
- **[UI README](./ui/README.md)** - Frontend documentation

## Architecture

**Module Federation Monorepo** with runtime-loaded configuration:

```
┌─────────────────────────────────────────────────────────┐
│                  Gateway/Hono.js                         │
│  Runtime Configuration Loader + Plugin System             │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Module Federation│      │ every-plugin     │         │
│  │ Runtime          │      │ Runtime          │         │
│  └────────┬─────────┘      └────────┬─────────┘         │
│           ↓                         ↓                   │
│  Loads UI Remote           Loads API Plugins            │
└───────────┬─────────────────────────┬───────────────────┘
             ↓                         ↓
┌───────────────────────┐ ┌───────────────────────┐
│    ui/ (Remote)       │ │   api/ (Plugin)       │
│  React + TanStack     │ │  oRPC + Effect        │
│  remoteEntry.js       │ │  remoteEntry.js       │
└───────────────────────┘ └───────────────────────┘
```

**Key Features:**

- ✅ **Runtime Configuration** - All URLs loaded from `bos.config.json` (no rebuild needed!)
- ✅ **Independent Deployment** - UI, API, and Host deploy separately
- ✅ **Type Safety** - End-to-end with oRPC contracts
- ✅ **CDN-Ready** - Module Federation with automatic CDN deployment

## Tech Stack

**Frontend:**

- React 19 + TanStack Router (file-based) + TanStack Query
- Tailwind CSS v4 + shadcn/ui components
- Module Federation for microfrontend architecture

**Backend:**

- Hono.js server + oRPC (type-safe RPC + OpenAPI)
- every-plugin architecture for modular APIs
- Effect-TS for service composition

**Database & Auth:**

- PostgreSQL + Drizzle ORM
- Better-Auth with NEAR Protocol support

## Configuration

All runtime configuration lives in `bos.config.json`:

```json
{
  "account": "example.near",
  "app": {
    "ui": {
      "name": "ui",
      "development": "http://localhost:3002",
      "production": "https://cdn.example.com/ui/remoteEntry.js"
    },
    "api": {
      "name": "api",
      "development": "http://localhost:3014",
      "production": "https://cdn.example.com/api/remoteEntry.js",
      "variables": {},
      "secrets": ["API_DATABASE_URL", "API_DATABASE_AUTH_TOKEN"]
    }
  }
}
```

## Related Projects

- **[near-kit](https://kit.near.tools)** - Unified NEAR Protocol SDK
- **[better-near-auth](https://github.com/elliotBraem/better-near-auth)** - NEAR authentication for Better-Auth
- **[every-plugin](https://github.com/near-everything/every-plugin)** - Plugin framework for modular APIs

## License

MIT
