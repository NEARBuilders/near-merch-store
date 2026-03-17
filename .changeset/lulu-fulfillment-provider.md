---
"api": minor
"ui": minor
---

Add Lulu fulfillment provider for print-on-demand books

- Add LuluService with OAuth2 authentication and print-jobs API integration
- Add config-driven Lulu book sync with configurable PDF and preview file metadata
- Add shipping quote and tax/VAT aggregation support for mixed Printful and Lulu carts
- Add Lulu webhook handling and provider configuration in admin UI
- Generalize provider admin APIs so Printful and Lulu share the same webhook/test flow
- Update environment configuration and product sync behavior for Lulu support
