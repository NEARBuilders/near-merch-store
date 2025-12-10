# marketplace-demo

A NEAR-powered marketplace demo showcasing e-commerce with print-on-demand fulfillment.

Built with React, Hono.js, oRPC, Better-Auth, and Module Federation.

## Setup

1. `bun install` - Install dependencies
2. `bun db:migrate` - Run database migrations
3. `bun start` - Start all development servers

## Architecture

**Monorepo with federated plugins:**

- `host/` - Server host with Module Federation + oRPC router
- `ui/` - React remote module (Rsbuild + Module Federation)
- `api/` - API plugin (Rspack + every-plugin)

```
┌─────────────────────────────────────────────────────────┐
│                        host                             │
│                                                         │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  remotes.json    │      │  registry.json   │         │
│  │  (UI federation) │      │  (API plugins)   │         │
│  └────────┬─────────┘      └────────┬─────────┘         │
│           │                         │                   │
│           ↓                         ↓                   │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │ Module Federation│      │ every-plugin     │         │
│  │ @module-fed/     │      │ runtime          │         │
│  │ rsbuild-plugin   │      │                  │         │
│  └────────┬─────────┘      └────────┬─────────┘         │
│           │                         │                   │
│           ↓                         ↓                   │
│  ┌──────────────────────────────────────────────┐       │
│  │              oRPC Router                     │       │
│  │  baseRouter + plugins.api.router             │       │
│  └──────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
            ↑                         ↑
            │                         │
┌───────────┴───────────┐ ┌───────────┴───────────┐
│         ui/           │ │         api/          │
│  Rsbuild + MF         │ │  Rspack + every-plugin│
│  remoteEntry.js       │ │  createPlugin()       │
└───────────────────────┘ └───────────────────────┘
```

**UI Federation** (`remotes.json`)

- Host loads UI as Module Federation remote
- Shares React, TanStack Query/Router, near-kit

**API Plugin Federation** (`registry.json`)

- Host loads API plugin via every-plugin runtime
- Plugin exposes oRPC router, merged into host router
- Supports multiple plugins with independent contracts

## Tech Stack

- **Frontend**: React + TanStack Router + TanStack Query + Tailwind CSS
- **Backend**: Hono.js + oRPC + every-plugin
- **Auth**: Better-Auth + NEAR Protocol
- **Database**: SQLite (libsql) + Drizzle ORM
- **Fulfillment**: Printful + Stripe

## Available Scripts

- `bun dev` - Start all development servers
- `bun dev:ui` - Start frontend only
- `bun dev:host` - Start host server only
- `bun build` - Build all packages
- `bun db:migrate` - Run database migrations
- `bun db:studio` - Open Drizzle Studio
