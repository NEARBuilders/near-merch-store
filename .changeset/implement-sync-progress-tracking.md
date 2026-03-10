---
"api": minor
"ui": minor
---

Implement real-time product sync progress tracking with cancellation support

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
