---
"api": minor
"ui": minor
---

Add exclusive products with fee splits and product metadata

- Add `exclusive` boolean field to products for storefront filtering
- Add `metadata` JSON field to products for creator account and fee splits
- Add `/exclusives` route showing exclusive products
- Add admin inventory editors for exclusive toggle and metadata configuration
- Add PingPay fee support for checkout with creator royalties
- Add database index on `exclusive` for query performance
