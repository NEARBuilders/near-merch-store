# Multi-Tenant Architecture Plan

This document outlines the implementation plan for transforming the host into a multi-tenant platform similar to Neocities, where each NEAR account can have their own store at a subdomain.

## Overview

The goal is to enable any NEAR account to create their own store by:
1. Storing their configuration in NEAR Social
2. Accessing their store via subdomain (e.g., `alice.everything.market`)
3. Customizing their UI theme and API plugins

## Architecture Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOST (Multi-Tenant Gateway)                      │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │   Tenant Resolution Layer                                   │    │
│  │   - Subdomain routing: tenant.everything.market            │    │
│  │   - Custom domain mapping: mystore.com → tenant config     │    │
│  │   - NEAR account-based identity (near-merch-store.near)    │    │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │   Dynamic Config Loader (per-tenant bos.config)            │    │
│  │   - Fetched from NEAR Social: {account}/settings/everything│    │
│  │   - Falls back to platform defaults                        │    │
│  │   - Cached with TTL for performance                        │    │
│  └────────────────────────────────────────────────────────────┘     │
│                              ↓                                      │
│  ┌────────────────────────────────────────────────────────────┐     │
│  │   Isolated Runtime per Tenant                              │    │
│  │   - UI: Load tenant's chosen remoteEntry.js                │    │
│  │   - API: Load tenant's configured plugins                  │    │
│  │   - Theme: Apply tenant's custom theming                   │    │
│  └────────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Domain & Naming Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAIN STRATEGY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  everything.dev    → Developer tooling, host, documentation     │
│  everything.market → Consumer-facing marketplace gateway        │
│                                                                 │
│  everything.near   → Platform contract (registry/config)        │
│  every.near        → Sub-account factory for plugins/apps       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### URL Patterns

| URL Pattern | Purpose |
|-------------|---------|
| `everything.market` | Landing page, discover stores |
| `near.everything.market` | Official NEAR merch store |
| `{account}.everything.market` | Any NEAR account's store |
| `{custom}.everything.market` | Reserved/premium subdomains |
| | |
| `everything.dev` | Developer docs, host admin |
| `api.everything.dev` | API gateway / plugin registry |
| `cdn.everything.dev` | Zephyr CDN alias |

### NEAR Account Hierarchy

```
everything.near (Platform Root)
├── settings/platform         → Global platform defaults
├── settings/plugins          → Available plugin registry
├── settings/themes           → Available theme registry
└── widget/                   → BOS widgets (if needed)

every.near (Sub-account Factory)
├── marketplace.every.near    → Marketplace API plugin
├── auth.every.near           → Auth service plugin
├── relay.every.near          → Meta-tx relayer plugin
└── {custom}.every.near       → User-deployed plugins

User Accounts (any .near)
├── alice.near/settings/everything.market
│   └── { ui: {...}, api: {...}, theme: {...} }
├── nearcatalog.near/settings/everything.market
│   └── { ui: {...}, api: {...}, theme: {...} }
```

## Request Resolution Flow

```
                    Request: alice.everything.market
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│                         HOST                                  │
│  1. Extract subdomain: "alice"                               │
│  2. Validate NEAR account: alice.near ✓                      │
│  3. Fetch config from NEAR Social:                           │
│     social.near → alice.near/settings/everything.market      │
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│               alice.near/settings/everything.market           │
│  {                                                           │
│    "ui": {                                                   │
│      "name": "marketplace_ui",                               │
│      "url": "https://cdn.everything.dev/ui/v1"               │
│    },                                                        │
│    "api": {                                                  │
│      "plugins": {                                            │
│        "marketplace.every.near": {                           │
│          "url": "https://cdn.everything.dev/api/v1"          │
│        }                                                     │
│      }                                                       │
│    },                                                        │
│    "theme": { "primaryColor": "#00EC97" }                    │
│  }                                                           │
└──────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────┐
│  HOST loads:                                                  │
│  - UI from config.ui.url                                     │
│  - API plugins from config.api.plugins                       │
│  - Applies theme overrides                                   │
│  - Renders store for alice.near                              │
└──────────────────────────────────────────────────────────────┘
```

## Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                  everything.market (Gateway)                    │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Tenant Resolution Middleware                             │  │
│  │  - Extracts subdomain from request                        │  │
│  │  - Maps to NEAR account (alice → alice.near)              │  │
│  │  - Special cases: www, api, near (official store)         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Config Loader (near-social-js)                           │  │
│  │  - Fetches: {account}/settings/everything.market          │  │
│  │  - Falls back to platform defaults if not found           │  │
│  │  - Caches with TTL for performance                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌───────────────────────────▼───────────────────────────────┐  │
│  │  Dynamic Module Federation                                │  │
│  │  - Loads UI remote from tenant config                     │  │
│  │  - Loads API plugins from tenant config                   │  │
│  │  - Injects tenant context (accountId, theme)              │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   UI Remotes  │    │  API Plugins  │    │   NEAR Social │
│               │    │               │    │               │
│ marketplace_ui│    │ marketplace   │    │ User configs  │
│ custom_theme  │    │ auth          │    │ Platform data │
│ minimal_ui    │    │ relay         │    │ Widget assets │
└───────────────┘    └───────────────┘    └───────────────┘
     (CDN)              (every.near)          (social.near)
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] **Step 1: Add near-social-js dependency**
  ```bash
  cd host
  bun add near-social-js
  ```

- [ ] **Step 2: Create tenant config service**
  - File: `host/src/lib/tenant.ts`
  - Implements: `getTenantConfig()`, `resolveTenantFromHost()`
  - Features: NEAR Social fetching, caching with TTL

- [ ] **Step 3: Create tenant middleware**
  - File: `host/src/middleware/tenant.ts`
  - Implements: Hono middleware for tenant resolution
  - Sets: `tenant`, `isMultiTenant`, `accountId` in context

- [ ] **Step 4: Update server.ts**
  - Add tenant middleware after CORS
  - Make config loading tenant-aware
  - Pass tenant context to handlers

- [ ] **Step 5: Update federation.ts**
  - Make remote registration dynamic
  - Support per-request remote loading
  - Handle tenant-specific UI remotes

### Phase 2: Railway & DNS Setup

- [ ] **Step 6: Configure wildcard subdomain on Railway**
  - Add custom domain: `*.everything.market`
  - Add custom domain: `*.everything.dev`
  - Configure SSL certificates

- [ ] **Step 7: Configure DNS records**
  ```
  *.everything.market  CNAME  your-app.up.railway.app
  *.everything.dev     CNAME  your-app.up.railway.app
  everything.market    CNAME  your-app.up.railway.app
  everything.dev       CNAME  your-app.up.railway.app
  ```

- [ ] **Step 8: Update environment variables on Railway**
  ```env
  NODE_ENV=production
  CORS_ORIGIN=https://*.everything.market,https://*.everything.dev
  ```

### Phase 3: NEAR Social Config Schema

- [ ] **Step 9: Define and document config schema**
  - Create JSON schema for tenant configs
  - Document required and optional fields
  - Provide example configurations

- [ ] **Step 10: Create setup UI component**
  - File: `ui/src/routes/setup.tsx`
  - Allows users to configure their store
  - Saves config to NEAR Social

- [ ] **Step 11: Create store management dashboard**
  - Theme customization
  - Plugin selection
  - Store metadata editing

### Phase 4: Platform Registry (Optional)

- [ ] **Step 12: Store platform defaults in everything.near**
  - Default UI and API plugin URLs
  - Available plugins list
  - Available themes list

- [ ] **Step 13: Create plugin marketplace UI**
  - Browse available plugins
  - Install/configure plugins
  - Manage plugin settings

- [ ] **Step 14: Create theme marketplace UI**
  - Browse available themes
  - Preview themes
  - Apply themes

---

## File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `host/src/lib/tenant.ts` | Tenant resolution & config fetching from NEAR Social |
| `host/src/middleware/tenant.ts` | Hono middleware for tenant context |
| `ui/src/routes/setup.tsx` | User configuration UI for store setup |
| `ui/src/routes/dashboard.tsx` | Store management dashboard |

### Files to Modify

| File | Changes |
|------|---------|
| `host/package.json` | Add `near-social-js` dependency |
| `host/server.ts` | Add tenant middleware, tenant-aware routing |
| `host/src/federation.ts` | Dynamic remote registration per tenant |
| `host/src/config.ts` | Tenant-aware config loading, merge with defaults |
| `host/src/main.tsx` | Pass tenant context to UI remote |
| `host/src/runtime.ts` | Tenant-aware plugin loading |

---

## Detailed Implementation

### Step 2: Tenant Config Service

**File: `host/src/lib/tenant.ts`**

```typescript
import { Graph } from 'near-social-js';

export interface TenantConfig {
  accountId: string;
  ui: {
    name: string;
    url: string;
    exposes?: Record<string, string>;
  };
  api: {
    plugins: Record<string, {
      url: string;
      variables?: Record<string, any>;
      secrets?: Record<string, string>;
    }>;
  };
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
  };
  store?: {
    name?: string;
    description?: string;
    banner?: string;
  };
}

const graph = new Graph();
const configCache = new Map<string, { config: TenantConfig; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTenantConfig(accountId: string): Promise<TenantConfig | null> {
  // Check cache first
  const cached = configCache.get(accountId);
  if (cached && Date.now() < cached.expiry) {
    return cached.config;
  }

  try {
    // Fetch from NEAR Social
    const data = await graph.get({
      keys: [`${accountId}/settings/everything.market`],
    });

    const configStr = data?.[accountId]?.settings?.['everything.market'];
    if (!configStr) return null;

    const parsed = typeof configStr === 'string' ? JSON.parse(configStr) : configStr;
    
    const config: TenantConfig = {
      accountId,
      ...parsed,
    };

    // Validate required fields
    if (!config.ui?.name || !config.ui?.url) {
      console.warn(`[Tenant] Invalid config for ${accountId}: missing ui.name or ui.url`);
      return null;
    }

    // Cache the result
    configCache.set(accountId, { config, expiry: Date.now() + CACHE_TTL });

    return config;
  } catch (error) {
    console.error(`[Tenant] Failed to fetch config for ${accountId}:`, error);
    return null;
  }
}

export function clearTenantCache(accountId?: string): void {
  if (accountId) {
    configCache.delete(accountId);
  } else {
    configCache.clear();
  }
}

export function resolveTenantFromHost(hostname: string): string | null {
  // Handle localhost development
  if (hostname.includes('localhost')) {
    const match = hostname.match(/^([^.]+)\.localhost/);
    if (match) {
      const subdomain = match[1];
      if (subdomain === 'near') return 'near-merch-store.near';
      return `${subdomain}.near`;
    }
    return null;
  }

  // Match: {account}.everything.market or {account}.everything.dev
  const match = hostname.match(/^([^.]+)\.(everything\.market|everything\.dev)$/);
  
  if (!match) return null;
  
  const subdomain = match[1];
  
  // Skip reserved subdomains
  const reserved = ['www', 'api', 'cdn', 'admin', 'app', 'dashboard', 'docs'];
  if (reserved.includes(subdomain)) {
    return null;
  }
  
  // Special case: "near" subdomain is the official store
  if (subdomain === 'near') {
    return 'near-merch-store.near';
  }
  
  // Convert subdomain to NEAR account
  return `${subdomain}.near`;
}

export async function getPlatformDefaults(): Promise<Partial<TenantConfig>> {
  try {
    const data = await graph.get({
      keys: ['everything.near/settings/platform'],
    });

    const defaults = data?.['everything.near']?.settings?.platform;
    if (!defaults) return {};

    return typeof defaults === 'string' ? JSON.parse(defaults) : defaults;
  } catch (error) {
    console.error('[Tenant] Failed to fetch platform defaults:', error);
    return {};
  }
}
```

### Step 3: Tenant Middleware

**File: `host/src/middleware/tenant.ts`**

```typescript
import { createMiddleware } from 'hono/factory';
import { 
  getTenantConfig, 
  resolveTenantFromHost, 
  getPlatformDefaults,
  type TenantConfig 
} from '../lib/tenant';

export type TenantVariables = {
  tenant: TenantConfig | null;
  isMultiTenant: boolean;
  accountId: string | null;
};

export const tenantMiddleware = createMiddleware<{
  Variables: TenantVariables;
}>(async (c, next) => {
  const hostname = c.req.header('host') || '';
  const accountId = resolveTenantFromHost(hostname);

  if (!accountId) {
    // Not a tenant subdomain - use default config
    c.set('tenant', null);
    c.set('isMultiTenant', false);
    c.set('accountId', null);
    return next();
  }

  console.log(`[Tenant] Resolving config for: ${accountId}`);

  // Fetch tenant config from NEAR Social
  let tenantConfig = await getTenantConfig(accountId);

  if (!tenantConfig) {
    // Account hasn't set up their store
    // Could show setup page, use defaults, or return 404
    console.log(`[Tenant] No config found for ${accountId}, using platform defaults`);
    
    const defaults = await getPlatformDefaults();
    if (defaults.ui && defaults.api) {
      tenantConfig = {
        accountId,
        ui: defaults.ui as TenantConfig['ui'],
        api: defaults.api as TenantConfig['api'],
        theme: defaults.theme,
        store: {
          name: `${accountId}'s Store`,
          description: 'A store powered by everything.market',
        },
      };
    }
  }

  c.set('tenant', tenantConfig || null);
  c.set('isMultiTenant', true);
  c.set('accountId', accountId);

  return next();
});
```

### Step 4: Server Updates

**Modifications to `host/server.ts`:**

```typescript
// Add import at top
import { tenantMiddleware, type TenantVariables } from './src/middleware/tenant';
import { type TenantConfig } from './src/lib/tenant';

// Update Hono app type
const apiApp = new Hono<{ Variables: TenantVariables }>();

// Add tenant middleware after CORS
apiApp.use('/*', tenantMiddleware);

// Add tenant context to request handling
async function createContext(req: Request, tenant: TenantConfig | null) {
  const session = await auth.api.getSession({ headers: req.headers });
  return {
    session,
    user: session?.user,
    tenant, // Include tenant info in context
  };
}

// Update handlers to use tenant context
apiApp.all('/api/*', async (c) => {
  const req = c.req.raw;
  const tenant = c.get('tenant');
  const context = await createContext(req, tenant);

  const result = await apiHandler.handle(req, {
    prefix: '/api',
    context,
  });

  return result.response
    ? c.newResponse(result.response.body, result.response)
    : c.text('Not Found', 404);
});
```

### Step 5: Federation Updates

**Modifications to `host/src/federation.ts`:**

```typescript
import { registerRemotes, init, loadRemote } from '@module-federation/enhanced/runtime';
import type { TenantConfig } from './lib/tenant';
import { loadBosConfig, type RuntimeConfig } from './config';

let initialized = false;
let defaultConfig: RuntimeConfig | null = null;

export async function initializeFederation() {
  if (initialized) return defaultConfig;
  
  defaultConfig = await loadBosConfig();
  
  init({
    name: 'host',
    remotes: [],
  });
  
  initialized = true;
  return defaultConfig;
}

export function getDefaultConfig() {
  if (!defaultConfig) {
    throw new Error('Federation not initialized');
  }
  return defaultConfig;
}

export async function registerTenantRemote(tenant: TenantConfig) {
  console.log(`[Federation] Registering tenant remote: ${tenant.ui.name} from ${tenant.ui.url}`);
  
  registerRemotes([
    {
      name: tenant.ui.name,
      entry: `${tenant.ui.url}/remoteEntry.js`,
      alias: tenant.ui.name,
    },
  ]);
}

export async function loadTenantApp(tenant: TenantConfig) {
  await registerTenantRemote(tenant);
  
  const module = await loadRemote<{ default: React.FC }>(`${tenant.ui.name}/App`);
  if (!module) {
    throw new Error(`Failed to load ${tenant.ui.name}/App`);
  }
  
  return module.default;
}
```

---

## NEAR Social Config Schema

### Full Schema Definition

```typescript
interface EverythingMarketConfig {
  // UI Remote Configuration (required)
  ui: {
    name: string;        // Module Federation remote name
    url: string;         // CDN URL to remoteEntry.js
    exposes?: {          // Optional: custom exposed modules
      App?: string;
      components?: string;
      providers?: string;
    };
  };
  
  // API Plugins Configuration (required)
  api: {
    plugins: {
      [pluginName: string]: {
        url: string;                          // CDN URL to plugin
        variables?: Record<string, any>;      // Public config
        secrets?: Record<string, string>;     // Secret references
      };
    };
  };
  
  // Theme Customization (optional)
  theme?: {
    primaryColor?: string;     // Hex color
    secondaryColor?: string;   // Hex color
    backgroundColor?: string;  // Hex color
    textColor?: string;        // Hex color
    logo?: string;             // IPFS CID or URL
    favicon?: string;          // IPFS CID or URL
    fontFamily?: string;       // Google Font name
  };
  
  // Store Metadata (optional)
  store?: {
    name?: string;             // Store display name
    description?: string;      // Store description
    banner?: string;           // IPFS CID or URL
    socialLinks?: {
      twitter?: string;
      discord?: string;
      telegram?: string;
      website?: string;
    };
  };
  
  // Feature Flags (optional)
  features?: {
    enableCart?: boolean;
    enableWishlist?: boolean;
    enableSearch?: boolean;
    enableReviews?: boolean;
  };
}
```

### Example Configuration

```json
{
  "ui": {
    "name": "marketplace_ui",
    "url": "https://cdn.everything.dev/ui/v1"
  },
  "api": {
    "plugins": {
      "marketplace.every.near": {
        "url": "https://cdn.everything.dev/api/v1",
        "variables": {
          "network": "mainnet"
        }
      }
    }
  },
  "theme": {
    "primaryColor": "#00EC97",
    "secondaryColor": "#1A1A2E",
    "logo": "ipfs://bafkreiexample..."
  },
  "store": {
    "name": "Alice's NEAR Store",
    "description": "Handcrafted merchandise for the NEAR community",
    "socialLinks": {
      "twitter": "alice_near",
      "discord": "https://discord.gg/example"
    }
  },
  "features": {
    "enableCart": true,
    "enableWishlist": true,
    "enableSearch": true,
    "enableReviews": false
  }
}
```

### Storing Config via near-social-js

```typescript
import { Graph } from 'near-social-js';
import { Near } from 'near-kit';

const near = new Near({ network: 'mainnet' });
const graph = new Graph({ near });

// Save store configuration
async function saveStoreConfig(accountId: string, config: EverythingMarketConfig) {
  const tx = await graph.set({
    signerId: accountId,
    data: {
      [accountId]: {
        settings: {
          'everything.market': JSON.stringify(config),
        },
      },
    },
  });
  
  await tx.send();
}

// Read store configuration
async function getStoreConfig(accountId: string) {
  const data = await graph.get({
    keys: [`${accountId}/settings/everything.market`],
  });
  
  const configStr = data?.[accountId]?.settings?.['everything.market'];
  return configStr ? JSON.parse(configStr) : null;
}
```

---

## Priority Matrix

| Phase | Step | Description | Priority | Effort |
|-------|------|-------------|----------|--------|
| **1** | 1 | Add `near-social-js` | 🔴 Critical | Low |
| **1** | 2 | Create tenant config service | 🔴 Critical | Medium |
| **1** | 3 | Create tenant middleware | 🔴 Critical | Medium |
| **1** | 4 | Update server.ts | 🔴 Critical | Medium |
| **1** | 5 | Update federation.ts | 🔴 Critical | Medium |
| **2** | 6 | Configure Railway wildcard | 🔴 Critical | Low |
| **2** | 7 | Configure DNS records | 🔴 Critical | Low |
| **2** | 8 | Update environment variables | 🔴 Critical | Low |
| **3** | 9 | Define config schema | 🟡 Important | Low |
| **3** | 10 | Create setup UI | 🟡 Important | High |
| **3** | 11 | Create management dashboard | 🟡 Important | High |
| **4** | 12 | Platform defaults in everything.near | 🟢 Nice-to-have | Medium |
| **4** | 13 | Plugin marketplace UI | 🟢 Nice-to-have | High |
| **4** | 14 | Theme marketplace UI | 🟢 Nice-to-have | High |

---

## Testing Strategy

### Local Development

1. **Modify /etc/hosts for subdomain testing:**
   ```
   127.0.0.1 alice.localhost
   127.0.0.1 bob.localhost
   127.0.0.1 near.localhost
   ```

2. **Set up test configs in NEAR Social (testnet):**
   ```bash
   # Use near-social-js to create test configs
   ```

3. **Run host with wildcard support:**
   ```bash
   HOST=0.0.0.0 bun dev:host
   ```

### Integration Tests

- [ ] Test subdomain resolution
- [ ] Test config fetching from NEAR Social
- [ ] Test cache behavior (TTL, invalidation)
- [ ] Test fallback to platform defaults
- [ ] Test dynamic Module Federation loading
- [ ] Test theme application
- [ ] Test API plugin loading per tenant

---

## Security Considerations

1. **Subdomain Validation**
   - Validate that subdomain corresponds to a valid NEAR account
   - Prevent reserved subdomain hijacking
   - Rate limit config fetches

2. **Config Validation**
   - Validate all URLs point to allowed CDN origins
   - Sanitize theme values (prevent CSS injection)
   - Validate plugin URLs against registry

3. **Secret Management**
   - Tenant secrets should use template injection `{{VAR}}`
   - Platform-level secrets stored in Railway/environment
   - Never expose secrets in client-side code

4. **CORS Configuration**
   - Dynamically set CORS based on tenant domain
   - Allow tenant custom domains

---

## Future Enhancements

1. **Custom Domain Support**
   - Allow tenants to use their own domains
   - DNS verification flow
   - SSL certificate provisioning

2. **Analytics Dashboard**
   - Per-tenant analytics
   - Sales tracking
   - Visitor metrics

3. **Plugin Ecosystem**
   - Plugin submission workflow
   - Plugin verification/auditing
   - Revenue sharing for plugins

4. **Theme Builder**
   - Visual theme editor
   - Export/import themes
   - Theme marketplace
