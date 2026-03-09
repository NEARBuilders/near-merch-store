---
"api": minor
---

Add accurate tax calculation using Printful Tax Rate API

- Replace hardcoded 8% tax with dynamic calculation via Printful API
- Support US sales tax (varies by state/zip), EU VAT, UK VAT
- Handle B2B tax exemptions via VAT ID validation
- Correctly apply tax to shipping when required by jurisdiction
- Store complete tax breakdown in database for audit trail
- Verify shipping cost and tax on checkout creation (security)
