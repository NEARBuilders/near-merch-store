---
"ui": minor
---

Improve checkout UX with auto-calculation, form persistence, and better validation

- Add form persistence to localStorage (24h expiry) to prevent data loss on page refresh
- Auto-calculate shipping when all required fields are filled
- Add field-level validation with inline error messages
- Make pay button always visible with disabled state tooltips explaining why it's disabled
- Enhance terms checkbox visibility and prominence with green accent and "Required" badge
- Remove ~50 lines of manual validation code by using TanStack Form best practices
- Provide immediate validation feedback on blur for all required fields
