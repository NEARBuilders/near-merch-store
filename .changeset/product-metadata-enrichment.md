---
"api": minor
"ui": minor
---

Add product metadata enrichment with Printful provider details and fee display on storefront

- Extend ProductMetadataSchema with providerDetails.printful for brand/model/description/techniques/placements/GSM
- Fetch catalog product details from Printful API during sync to enrich product metadata
- Fix admin inventory metadata editor to use "Product Metadata" label and percentage inputs (converts to BPS)
- Display fee percentage on product cards next to price
- Show fee breakdown and provider facts on product detail page
- Add creator fees line item to cart and checkout order summaries
