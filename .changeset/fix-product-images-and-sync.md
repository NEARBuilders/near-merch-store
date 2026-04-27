---
"api": patch
---

Fix product page images and sync image handling

- Fix Printful `preview` file images (product mockups) being skipped during sync — they are now included as `preview` type images that pass the product page filter
- Fix `catalog` thumbnail images absorbing `preview` file images when they share the same CDN URL — `preview` files now upgrade the catalog entry's type to `preview` and merge variantIds
- Fix image merge on re-sync to update existing images when type or variantIds differ, not just add new images
- Refresh base `price` on re-sync (was previously preserved as stale)
- Fix hardcoded `technique: 'dtg'` in `generateMockupsForProduct()` — now resolves technique from V2 catalog placement data
