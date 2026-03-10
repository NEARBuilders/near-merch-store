---
"api": minor
"ui": minor
---

Add comprehensive order audit logging and admin order management

**Database:**
- Add `isDeleted` flag to orders table for soft delete support
- Create `order_audit_logs` table to track all order changes

**API Features:**
- Add `getOrderAuditLog` endpoint for viewing order history (accessible by admins and order owners)
- Add `updateOrderStatus` endpoint for admin manual status updates
- Add `deleteOrders` endpoint for bulk delete with soft/hard delete logic
- Add `requireAdmin` middleware for proper admin access control
- Update API context schema to include user object with role

**Admin Dashboard:**
- Add row selection checkboxes for bulk actions using TanStack Table
- Add "Delete Selected" button with confirmation modal showing draft vs non-draft breakdown
- Add "View History" button per order showing full audit timeline
- Replace alert() with proper toast notifications using sonner

**User Experience:**
- Add "Order Timeline" button in user's order list
- Add "Order History" section in order confirmation page
- Timeline shows status changes and tracking updates (filtered for users)

**Audit Logging:**
- Webhooks from Printful, Gelato, Stripe, and PingPay automatically log changes with `service:` prefix
- Admin manual edits are logged with the admin's NEAR account
- Non-draft deletions are soft-deleted and logged for audit purposes
- Draft orders are hard-deleted permanently

**Code Quality:**
- Create shared `AuditLogViewer` component to eliminate code duplication
- Fix React anti-pattern: use useEffect instead of useState for data fetching
- Add proper error logging to gelato webhook catch block
- Fix TypeScript type errors and remove unused imports
- All type checks pass
