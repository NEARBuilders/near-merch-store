---
"api": minor
"ui": minor
---

Add Lulu fulfillment provider for print-on-demand books

- Add LuluService with OAuth2 authentication and print-jobs API integration
- Add webhook handler for order status updates (created, shipped, cancelled)
- Add shipping quote support for Lulu products
- Add Lulu provider configuration section in admin UI
- Fix mapToFulfillmentItems to pass providerData for Lulu book products
- Update .env.example files with Lulu credentials
