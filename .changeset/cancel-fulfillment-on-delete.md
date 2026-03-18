---
"api": patch
---

Fix order deletion to cancel fulfillment provider orders

- When deleting an order, now cancels draft orders with Lulu, Printful, and Gelato providers before local deletion
- Enhanced Lulu webhook handling to capture and log error details for REJECTED and ERROR statuses
- Added `errors` field to LuluPrintJobResponse type for better error reporting
