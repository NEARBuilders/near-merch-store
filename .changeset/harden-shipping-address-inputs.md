---
"api": patch
---

Harden ShippingAddress input parsing by trimming strings and treating empty optional fields (e.g. phone/state) as undefined.
