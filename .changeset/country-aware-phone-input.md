---
"ui": minor
---

Add country-aware phone number formatting on checkout

- Added libphonenumber-js for international phone number parsing and formatting
- Phone input now formats numbers based on selected country (e.g., US: +1 (234) 567-8900, UK: +44 20 1234 5678)
- Dynamic placeholder updates when country is selected
- Improved phone validation using libphonenumber-js country-specific rules
