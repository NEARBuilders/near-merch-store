---
"api": minor
"ui": minor
---

Move Legion purchase gating to product metadata and remove the legacy collection-exclusive flow

- Add a `legion-holder` purchase gate plugin with NEAR holder checks and checkout enforcement
- Add product metadata controls and storefront gating states for locked Legion products
- Remove old collection-exclusive API, schema, and database support
