---
"api": minor
---

Migrate to Printful V2 Order Estimation API for tax/VAT calculation

- Replace deprecated /tax/rates endpoint (410 error) with V2 Order Estimation API
- Add placements (design files) required by new API for full order cost calculation
- Return actual tax/VAT amounts from Printful instead of recalculating (eliminates rounding errors)
- Add vatAmount field to database schema and order types
- Fix form persistence to use setFieldValue instead of reset()
- Remove auto shipping calculation from checkout page
- Clean up debug console logs
