---
"api": minor
"ui": minor
---

Add provider-specific product details display

- Added ProductDetails component to display provider-specific details (GSM, material, page count, etc.)
- Each fulfillment provider (Printful, Lulu) now exports field configurations for their product details
- Added `getProviderFieldConfigs` API endpoint to fetch field configurations from providers
- Updated sync flow to copy `providerDetails` from provider products to product metadata
- Lulu products now include `pageCount` and `format` in their provider details
- Printful products include `brand`, `model`, `gsm`, `material`, `techniques`, and `placements`
