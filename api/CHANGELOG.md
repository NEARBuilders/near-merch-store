# Changelog

## 1.1.1

### Patch Changes

- ff33a93: Fix: Make user context nullable and add defensive checks

  - Update API context schema to accept nullable user field, matching the actual data structure from the host
  - Add defensive null checks for loaderData.orders and items arrays in orders page
  - Fix tracking info checks to properly handle undefined/null values
  - Remove verbose hydration/dehydration console logging from router and hydrate modules

## 1.1.0

### Minor Changes

- c9f0b04: Add accurate tax calculation using Printful Tax Rate API

  - Replace hardcoded 8% tax with dynamic calculation via Printful API
  - Support US sales tax (varies by state/zip), EU VAT, UK VAT
  - Handle B2B tax exemptions via VAT ID validation
  - Correctly apply tax to shipping when required by jurisdiction
  - Store complete tax breakdown in database for audit trail
  - Verify shipping cost and tax on checkout creation (security)

- a96433e: Add comprehensive order audit logging and admin order management

  **Database:**

  - Add `isDeleted` flag to orders table for soft delete support
  - Create `order_audit_logs` table to track all order changes

  **API Features:**

  - Add `getOrderAuditLog` endpoint for viewing order history (accessible by admins and order owners)
  - Add `updateOrderStatus` endpoint for admin manual status updates
  - Add `deleteOrders` endpoint for bulk delete with soft/hard delete logic
  - Add `requireAdmin` middleware for proper admin access control
  - Update API context schema to include user object with role

  **Admin Dashboard:**

  - Add row selection checkboxes for bulk actions using TanStack Table
  - Add "Delete Selected" button with confirmation modal showing draft vs non-draft breakdown
  - Add "View History" button per order showing full audit timeline
  - Replace alert() with proper toast notifications using sonner

  **User Experience:**

  - Add "Order Timeline" button in user's order list
  - Add "Order History" section in order confirmation page
  - Timeline shows status changes and tracking updates (filtered for users)

  **Audit Logging:**

  - Webhooks from Printful, Gelato, Stripe, and PingPay automatically log changes with `service:` prefix
  - Admin manual edits are logged with the admin's NEAR account
  - Non-draft deletions are soft-deleted and logged for audit purposes
  - Draft orders are hard-deleted permanently

  **Code Quality:**

  - Create shared `AuditLogViewer` component to eliminate code duplication
  - Fix React anti-pattern: use useEffect instead of useState for data fetching
  - Add proper error logging to gelato webhook catch block
  - Fix TypeScript type errors and remove unused imports
  - All type checks pass

- a96433e: Fix product sync pagination and add real-time progress tracking

  - Fix critical bug: Printful API was only fetching 20 products due to missing pagination
  - Add auto-pagination to fetch all products from Printful (was maxing at 20)
  - Add real-time sync progress via SSE with per-provider tracking
  - Add expandable per-provider progress view in admin dashboard
  - Add catalog variant caching to reduce API calls
  - Add parallel product fetching with concurrency limit (5 concurrent)
  - Add retry logic with exponential backoff for failed fetches
  - Add throttled progress updates (every 10 products) to reduce bandwidth
  - Limit provider concurrency to 2 to avoid rate limiting
  - Add `failed` count to sync results and display in completion toast
  - Simplify SSE handler from ~30 lines to ~15 lines using async generator
  - Consolidate types: SyncProgress now inferred from zod schema
  - Auto-clear progress 30 seconds after completion
  - Fix validation error: limit was 1000 but contract allowed max 100
  - Add continue-on-failure: failed providers show error, others continue
  - Update provider status to 'error' on failure with error message
  - Improve error messages: user-friendly instead of "Internal Server Error"
  - Fix frontend: invalidate syncStatus on error so UI updates correctly

- a96433e: Implement real-time product sync progress tracking with cancellation support

  **API Changes:**

  - Add SyncProgressStore with subscription-based real-time updates
  - Add SyncManager for managing active sync operations with Fiber-based concurrency
  - Add `subscribeSyncProgress` streaming endpoint for live progress updates
  - Add `cancelSync` endpoint to interrupt stuck sync operations
  - Implement heartbeat timeout detection (60s) for stale syncs
  - Add rate limiting for Printful API calls to prevent throttling
  - Update sync contract with progress types and cancellation support
  - Refactor Printful service to report granular sync progress per product

  **UI Changes:**

  - Add `useSyncProgress` hook for real-time sync state in admin dashboard
  - Add `cancelSync` mutation for manual sync interruption
  - Redesign inventory dashboard with live sync progress indicators
  - Display per-provider sync status, totals, and current product being synced
  - Add sync cancellation button for active operations
  - Show detailed error states and recovery actions for failed syncs

  This enables administrators to monitor product synchronization in real-time,
  identify bottlenecks, and recover gracefully from stuck operations.

- c9f0b04: Migrate to Printful V2 Order Estimation API for tax/VAT calculation

  - Replace deprecated /tax/rates endpoint (410 error) with V2 Order Estimation API
  - Add placements (design files) required by new API for full order cost calculation
  - Return actual tax/VAT amounts from Printful instead of recalculating (eliminates rounding errors)
  - Add vatAmount field to database schema and order types
  - Fix form persistence to use setFieldValue instead of reset()
  - Remove auto shipping calculation from checkout page
  - Clean up debug console logs

- bd6a274: ## Printful API V2 Migration & Sync Performance Improvements

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

- a96433e: Add order_updated webhook support for Printful to update order status to shipped when Printful marks orders as fulfilled

### Patch Changes

- f0d20a9: Harden ShippingAddress input parsing by trimming strings and treating empty optional fields (e.g. phone/state) as undefined.

## 1.0.1

### Patch Changes

- baf2af7: Harden ShippingAddress input parsing by trimming strings and treating empty optional fields (e.g. phone/state) as undefined.

## 1.0.0

### Major Changes

- 97e1666: v1 release of the merch store with printful fulfillment and pingpay payments

All notable changes to this package will be documented in this file.

## [Unreleased]

### Added

### Changed

### Fixed

### Removed

## [0.1.0] - 2026-02-05

### Added

- Initial API package structure
- Product catalog endpoints
- Order management services
- Payment integration (Stripe, PingPay)
- Fulfillment providers (Printful, Gelato)
- Authentication hooks
- Database schema and migrations
