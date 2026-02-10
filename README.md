
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

</div>

## Quick Start

```bash
bun install       # Install dependencies
bun db:migrate    # Run database migrations
bun dev           # Start all services (API, UI, Host)
```

Visit <http://localhost:3000> to see the application.

## Documentation

- **[LLM.txt](./LLM.txt)** - Technical guide for LLMs and developers (architecture, patterns, examples)
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

See [LLM.txt](./LLM.txt) for complete architecture details.

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

**Benefits:**

- Switch environments via `NODE_ENV` (no rebuild)
- Update CDN URLs without code changes
- Template injection for secrets

## Available Scripts

```bash
# Development
bun dev              # All services (API: 3014, UI: 3002)
bun dev:api          # API plugin only
bun dev:ui           # UI remote only

# Production
bun build            # Build all packages
bun build:api        # Build API plugin → uploads to CDN
bun build:ui         # Build UI remote → uploads to CDN

# Database
bun db:migrate       # Run migrations
bun db:push          # Push schema changes
bun db:studio        # Open Drizzle Studio
bun db:sync          # Sync products from live API to local database

# Testing
bun test             # Run all tests
bun typecheck        # Type checking
```

## Development Workflow

1. **Make changes** to any workspace (ui/, api/)
2. **Hot reload** works automatically during development
3. **Build & deploy** independently:
    - `bun build:ui` → uploads to CDN → updates `bos.config.json`
    - `bun build:api` → uploads to CDN → updates `bos.config.json`
    - Gateway automatically loads new versions!

See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed development workflow.

## Related Projects

- **[every-plugin](https://github.com/near-everything/every-plugin)** - Plugin framework for modular APIs
- **[near-kit](https://kit.near.tools)** - Unified NEAR Protocol SDK
- **[better-near-auth](https://github.com/elliotBraem/better-near-auth)** - NEAR authentication for Better-Auth

## License

MIT
