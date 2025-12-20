# ui

Marketplace frontend for browsing products, managing cart, and checkout.

## Tech Stack

- **Framework**: React 19
- **Routing**: TanStack Router (file-based)
- **Data**: TanStack Query + oRPC client
- **Styling**: Tailwind CSS v4
- **Build**: Rsbuild + Module Federation
- **Auth**: better-auth client

## Module Federation

Exposed as remote module for host consumption via `remoteEntry.js`:

| Export | Path | Description |
|--------|------|-------------|
| `./App` | `bootstrap.tsx` | Main app component |
| `./components` | `components/index.ts` | Reusable UI components |
| `./providers` | `providers/index.tsx` | Context providers |
| `./types` | `types/index.ts` | TypeScript types |

**Shared dependencies** (singleton):

- `react`, `react-dom`
- `@tanstack/react-query`, `@tanstack/react-router`
- `@hot-labs/near-connect`, `near-kit`

**Host configuration** (`bos.config.json`):

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

## Available Scripts

- `bun dev` - Start dev server (port 3002)
- `bun build` - Build for production
- `bun preview` - Preview production build
- `bun typecheck` - Type checking

## Project Structure

- `src/routes/` - File-based routes (TanStack Router)
- `src/components/` - UI components (shadcn/ui)
- `src/integrations/` - API integrations (oRPC client)
- `src/hooks/` - React hooks (cart, favorites)
- `src/providers/` - Context providers
