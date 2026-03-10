---
"ui": minor
---

Upgrade better-near-auth to 0.5.1 with single-step authentication

- Update better-near-auth from 0.3.4 to 0.5.1
- Update peer dependencies (@hot-labs/near-connect, near-kit, better-auth)
- Rename 'domain' to 'recipient' in client config
- Simplify auth flow from two-step to single-step
- Remove requestSignIn.near() calls
- Update error handling for new error codes
- Single popup for supported wallets (Meteor, Intear)
- Automatic fallback for unsupported wallets (HOT, MyNearWallet)
- Client-generated nonces for improved security
- Fixed "No accounts found" error in 0.5.0
- Proper wallet selector display before authentication
