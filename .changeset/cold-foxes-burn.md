---
"api": patch
"ui": patch
---

Require phone number for Lulu book checkout and fail early with a clear validation error instead of crashing during order creation.

- Validate provider-specific address requirements before quote and checkout on both UI and API
- Remove misleading dummy phone fallback in Lulu cost calculation
- Surface real validation errors to the user instead of generic 500s
