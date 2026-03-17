---
"api": patch
---

Fix Lulu book defaults and generated image IDs during product sync.

- Round the default Lulu book retail price to a clean whole-dollar amount
- Fall back to a stable generated image ID when synced provider files do not include one
