---
"api": minor
"ui": minor
---

Fix product sync pagination and add real-time progress tracking

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
