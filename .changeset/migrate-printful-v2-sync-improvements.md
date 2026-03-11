---
"@vibes/api": minor
"@vibes/ui": patch
---

## Printful API V2 Migration & Sync Performance Improvements

### API Changes

#### Migration to V2 API
- **Catalog Variants**: Migrated from V1 to Printful V2 API
  - New `getCatalogVariantV2()` method with strategy-based configuration
  - New `getCatalogVariantsV2()` batch method with concurrency control (6 concurrent requests)
  - 3-second timeout for best-effort operations, 10-second for standard operations
  - Zero retries for best-effort, 2 retries for standard operations
  - Built-in circuit breaker protection

#### V1 Sync Products Optimization
- Reduced timeout from 30s → 10s with AbortController
- Removed heavy retry logic (was 5 retries, now direct fetch)
- Proper timeout error handling with clear messages

#### Architecture Improvements
- **Operation Strategies**: Defined three strategies for different use cases:
  - `critical`: 30s timeout, 5 retries (for orders)
  - `standard`: 10s timeout, 2 retries (for sync products)
  - `bestEffort`: 3s timeout, 0 retries (for catalog enrichment)

- **Circuit Breaker Pattern**: Prevents cascade failures
  - Separate circuit breakers for V1, V2, and catalog APIs
  - Opens after 5 consecutive failures
  - Half-open state for gradual recovery
  - 1-minute timeout before retrying

- **Structured Logging**: New `SyncLogger` class
  - Phase-based logging (init, fetch_products, sync_to_db, cleanup)
  - Progress tracking with rate limiting (logs every 5 seconds)
  - Individual product success/failure logging
  - Completion summary with timing

#### Error Handling Improvements
- New error types: `CatalogVariantError`, `SyncProductError`
- Added `TIMEOUT` error code to `FulfillmentError`
- Better error messages without stack traces for expected failures

### UI Changes

#### Real-time Sync Progress
- Live progress bar showing "Synced X of ~Y products"
- Provider-specific status details
- Auto-refreshing product table every 3 seconds during sync
- Visual progress indicators with percentage complete

#### React Performance Fix
- Fixed React Error #185 (Maximum update depth exceeded)
- Proper AbortController cleanup in SSE subscription
- Removed infinite loop in `useSyncProgressSubscription`

#### TanStack Query Integration
- Native polling support with `refetchInterval`
- Dynamic polling based on sync status
- Proper cache management during sync operations

### Testing
- All 70 API tests pass
- All type checks pass (API + UI)
- No breaking changes to existing API contracts

### Performance Impact
- **Before**: 30s timeout + 5 retries = up to 150s per request
- **After**: 10s timeout + proper batching = ~30s max for sync operations
- **Before**: Sequential catalog variant fetches (N requests)
- **After**: Batch V2 API with concurrency (6 concurrent requests)

### Migration Notes
- Sync products remain on V1 API (no V2 endpoints available yet)
- Catalog variants migrated to V2 API (faster, better rate limiting)
- All changes are backward compatible
- Existing tests updated to reflect new behavior
