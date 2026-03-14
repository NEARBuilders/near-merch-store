---
"api": patch
"ui": patch
---

Fix: Make user context nullable and add defensive checks

- Update API context schema to accept nullable user field, matching the actual data structure from the host
- Add defensive null checks for loaderData.orders and items arrays in orders page
- Fix tracking info checks to properly handle undefined/null values
- Remove verbose hydration/dehydration console logging from router and hydrate modules
