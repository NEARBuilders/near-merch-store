---
"api": patch
"ui": patch
---

Fix Lulu shipping errors and improve error messages

- Fix state code handling for international addresses (use ISO-3166-2 codes, 2-3 chars)
- Convert technical Lulu API errors to user-friendly "Shipping is not available to this destination"
- Remove "Lulu" branding from user-facing messages
- Handle no shipping rates case with clear error message
