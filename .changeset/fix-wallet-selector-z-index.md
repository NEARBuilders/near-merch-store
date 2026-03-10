---
"ui": patch
---

Fix wallet selector z-index conflicts by removing login dialog

- Remove login dialog from marketplace header
- Redirect to dedicated login page instead
- Eliminate z-index conflicts between dialog overlay and wallet selector
- Add redirect parameter to return users to original page after login
- Remove duplicate sign-in logic from header
- Delete unused sign-in-form component
- Simplify codebase by ~60 lines
- Improve mobile experience with full-page login
