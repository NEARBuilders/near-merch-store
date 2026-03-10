---
"api": minor
"ui": minor
---

Add comprehensive order audit logging and admin order management

**Database:**
- Add `isDeleted` flag to orders table for soft delete support
- Create `order_audit_logs` table to track all order changes

**API Features:**
- Add `getOrderAuditLog` endpoint for viewing order history
- Add `updateOrderStatus` endpoint for admin manual status updates
- Add `deleteOrders` endpoint for bulk delete with soft/hard delete logic

**Admin Dashboard:**
- Add row selection checkboxes for bulk actions
- Add "Delete Selected" button with confirmation modal
- Add "View History" button per order showing full audit timeline
- Show draft vs non-draft breakdown in delete confirmation

**User Experience:**
- Add "Order Timeline" button in user's order list
- Add "Order History" section in order confirmation page
- Timeline shows status changes and tracking updates (filtered for users)

**Audit Logging:**
- Webhooks from Printful, Gelato, Stripe, and PingPay automatically log changes
- Admin manual edits are logged with the admin's NEAR account
- Non-draft deletions are soft-deleted and kept for audit purposes
- Draft orders are hard-deleted permanently
