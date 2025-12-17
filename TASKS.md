# Shipping & Multi-Provider Checkout Implementation

## Overview

This document outlines the implementation plan for proper shipping calculation and atomic multi-provider order fulfillment across Printful, Gelato, and other providers.

## Problem Statement

1. **Shipping costs are hardcoded** - Currently "Free Shipping" is set statically in Stripe checkout
2. **Address collection timing** - Address is collected at Stripe Checkout, too late for shipping calculation
3. **Multi-provider complexity** - Cart items from different providers (Printful, Gelato) need separate fulfillment orders
4. **Privacy concerns** - Don't want to store shipping addresses with wallet IDs in our database
5. **Atomicity** - Need to ensure: Quote → Pay → Fulfill happens reliably without money-taken-but-nothing-ships scenarios

## Architecture Decision

### Approach: Draft Orders Before Payment

**Flow:**
```
1. User enters address on merchant site
2. quoteOrder(address, items) → Calculate shipping from all providers
3. User confirms, calls createCheckout(address, items)
   - Create DRAFT orders at Printful/Gelato (they store address)
   - Create local order record (no address stored)
   - Create payment session (Stripe/NEAR/etc)
4. User pays
5. Webhook → Confirm draft orders
```

**Why Draft Orders First:**
- ✅ Provider stores address, we don't (privacy)
- ✅ Validates address/items before payment
- ✅ Price locked at draft creation
- ✅ No "paid but can't fulfill" scenario
- ⚠️ Requires draft cleanup job for abandoned carts

### Data Storage

| Data | Our DB | Printful/Gelato | Payment Provider |
|------|---------|-----------------|------------------|
| Order ID | ✅ | ✅ (external_id) | ✅ (metadata) |
| Wallet ID | ✅ | ❌ | ❌ |
| Items/Prices | ✅ | ✅ | ✅ (amount only) |
| Shipping Address | ❌ | ✅ (required) | ❌ |
| Payment Details | ❌ | ❌ | ✅ |

---

## Implementation Tasks

### Phase 1: Fulfillment Provider Contract Updates ✅ COMPLETED

- [x] **Add `quoteOrder` to FulfillmentContract**
  - Input: recipient address + order items
  - Output: shipping options with rates, delivery estimates
  - File: `api/src/services/fulfillment/contract.ts`

- [x] **Add `confirmOrder` to FulfillmentContract**
  - Input: draft order ID
  - Output: confirmed order ID + status
  - File: `api/src/services/fulfillment/contract.ts`

- [x] **Create schema types**
  - `ShippingQuoteInputSchema`
  - `ShippingQuoteOutputSchema`
  - `ShippingRateSchema`
  - File: `api/src/services/fulfillment/schema.ts`

### Phase 2: Printful Service Implementation ✅ COMPLETED

- [x] **Add `calculateShippingRates()` method**
  - Use Printful Shipping Rates v2 API
  - Endpoint: `POST /v2/shipping-rates`
  - Required: country_code, state_code (US/CA/AU), order items
  - File: `api/src/services/fulfillment/printful/service.ts`

- [x] **Add `quoteOrder()` method**
  - Wrapper around calculateShippingRates
  - Returns unified format matching FulfillmentContract
  - File: `api/src/services/fulfillment/printful/service.ts`

- [x] **Add `confirmOrder()` method**
  - Calls existing `confirmOrder(orderId)` on PrintfulClient
  - Changes draft order to confirmed/pending
  - File: `api/src/services/fulfillment/printful/service.ts`

- [x] **Update `createOrder()` to support draft mode**
  - Already supported via `confirm: boolean` parameter
  - When confirm=false, creates draft order without confirming
  - File: `api/src/services/fulfillment/printful/service.ts`

### Phase 3: Gelato Service Implementation ✅ COMPLETED

- [x] **Wire up existing `quoteOrder()` to contract**
  - Created contract-compliant `quoteOrder()` method
  - Wraps existing `quoteOrderDetailed()` method
  - File: `api/src/services/fulfillment/gelato/service.ts`

- [x] **Add `confirmOrder()` method**
  - Implemented confirmation method (checks order status)
  - Gelato transitions draft→order happen during creation
  - File: `api/src/services/fulfillment/gelato/service.ts`

- [x] **Ensure `createOrder()` supports draft mode**
  - Already supported via `orderType: 'draft'` parameter
  - File: `api/src/services/fulfillment/gelato/service.ts`

### Phase 4: Manual Provider Implementation

- [ ] **Add stub implementations**
  - `quoteOrder()` - returns flat rate or free shipping
  - `confirmOrder()` - no-op or updates internal status
  - File: `api/src/services/fulfillment/manual/` (may need to create)

### Phase 5: API Layer - Quote Endpoint ✅ COMPLETED

- [x] **Create `/quote` endpoint**
  - Input: cart items + shipping address
  - Groups items by fulfillment provider
  - Calls `provider.quoteOrder()` for each group
  - Aggregates results into single quote
  - Output: subtotal, shipping cost, total, delivery estimate
  - File: `api/src/contract.ts` and `api/src/index.ts`

- [x] **Add quote aggregation logic**
  - Handle multiple providers shipping to same address
  - Combine shipping costs
  - Calculate min/max delivery from all providers
  - File: Created `api/src/services/checkout.ts` with CheckoutService

### Phase 6: Checkout Flow Updates ⚙️ IN PROGRESS

- [x] **Implement `CheckoutService.createCheckout()` method**
  - Accepts shipping address, items, selected rates, and pre-calculated shipping cost
  - Groups items by fulfillment provider
  - Creates local order first
  - Creates draft orders at each provider (stores address at provider only)
  - Calls payment provider to create checkout session
  - Returns orderId, checkoutUrl, and draftOrderIds
  - File: `api/src/services/checkout.ts`

- [ ] **Update `createCheckout` API endpoint handler**
  - Replace single-item logic with CheckoutService.createCheckout()
  - Accept `shippingAddress`, `items[]`, `selectedRates`, `shippingCost` in input
  - File: `api/src/index.ts`

- [ ] **Update CreateCheckoutInputSchema**
  - Add `shippingAddress: ShippingAddressSchema`
  - Add `selectedRates: Record<string, string>`
  - Add `shippingCost: number`
  - Change `items` to array
  - File: `api/src/schema.ts`

### Phase 7: Order Schema Updates

- [ ] **Add fulfillment draft tracking**
  - Option A: Add `fulfillmentDraftId` to OrderItemSchema
  - Option B: Create separate `fulfillment_orders` table
  - Store provider name + draft order ID
  - File: `api/src/schema.ts` and `api/src/db/schema.ts`

- [ ] **Make `shippingAddress` optional/removed**
  - Privacy: don't store address in our DB
  - Providers store it in their systems
  - File: `api/src/schema.ts`

- [ ] **Add new order statuses**
  - `draft_created` - Draft orders created, awaiting payment
  - `paid_pending_fulfillment` - Payment received, fulfillment confirmation pending
  - File: `api/src/schema.ts`

### Phase 8: Webhook Updates

- [ ] **Update Stripe webhook handler**
  - Add idempotency check (order already paid?)
  - On `checkout.session.completed`:
    - Mark order as 'paid'
    - For each draft order:
      - Call `provider.confirmOrder(draftId)`
      - Update order status on success
      - Handle failures (retry logic)
    - If all confirmations succeed: status = 'processing'
    - If any fail: status = 'paid_pending_fulfillment' + log error
  - File: `api/src/index.ts` (stripeWebhook handler)

- [ ] **Add confirmation retry logic**
  - Store failed confirmations for retry
  - Exponential backoff
  - Max 3-5 retries
  - Alert/log if all retries fail
  - File: New `api/src/services/fulfillment-confirmation.ts`

### Phase 9: Payment Provider Abstraction ✅ COMPLETED

- [x] **Created Stripe Payment Plugin**
  - Follows same plugin pattern as Printful/Gelato
  - Removed `shipping_address_collection` (collected before payment now)
  - Accepts pre-calculated amounts as line items
  - Files: 
    - `api/src/services/payment/contract.ts` (PaymentContract)
    - `api/src/services/payment/schema.ts` (Payment schemas)
    - `api/src/services/payment/stripe/` (Stripe plugin)

- [x] **Extended MarketplaceRuntime for payment providers**
  - Runtime now loads both fulfillment AND payment providers
  - Added `getPaymentProvider()` method
  - File: `api/src/runtime.ts`

- [x] **Integrated payment provider into CheckoutService**
  - CheckoutService calls payment provider after creating draft orders
  - File: `api/src/services/checkout.ts`

### Phase 10: Cleanup & Maintenance

- [ ] **Add draft order cleanup job**
  - Query orders with status='draft_created' older than 24 hours
  - Call `provider.cancelOrder(draftId)` for each
  - Mark order as 'cancelled'
  - Schedule: Daily or every 6 hours
  - File: New `api/src/jobs/cleanup-drafts.ts`

- [ ] **Add monitoring/alerting**
  - Alert on failed fulfillment confirmations
  - Track conversion rate (draft → paid → fulfilled)
  - File: Add logging to relevant handlers

### Phase 11: UI Updates

- [ ] **Cart: Show "Shipping calculated at checkout"**
  - Remove any shipping estimates from cart
  - File: `ui/src/components/CartSidebar.tsx` (or equivalent)

- [ ] **Checkout: Add address collection form**
  - Collect shipping address before payment
  - Call `/quote` endpoint to get shipping cost
  - Display total before proceeding to payment
  - File: New or update checkout page

- [ ] **Update checkout mutation**
  - Pass address + items array to API
  - File: `ui/src/integrations/marketplace-api/checkout.ts`

### Phase 10.5: Code Quality & Cleanup ✅ COMPLETED

- [x] **Remove duplicate type definitions**
  - Removed duplicate `DesignFileSchema` from fulfillment/schema.ts
  - Now imports from main schema (single source of truth)

- [x] **Extract reusable schemas**
  - Created `PaymentLineItemSchema` in payment/schema.ts
  - Eliminated inline type definitions

- [x] **Fix `any` type casts**
  - Changed `fulfillmentConfig: any` → `FulfillmentConfig | undefined`
  - Removed `(df: any)` casts, using proper type inference
  - All types now properly derived from schemas via `z.infer<>`

- [x] **Optimize CheckoutService**
  - Extracted helper functions (`buildRecipient`, `mapToFulfillmentItems`)
  - Removed redundant loops and provider calls
  - Single-pass data collection, no redundant database queries

### Phase 12: Testing

- [ ] **Test multi-provider cart**
  - Cart with Printful + Gelato items
  - Verify separate draft orders created
  - Verify combined total correct

- [ ] **Test payment failure scenarios**
  - User abandons checkout
  - Verify drafts cleaned up

- [ ] **Test confirmation failures**
  - Mock provider confirmation failure
  - Verify retry logic works
  - Verify order marked correctly

- [ ] **Test address validation**
  - Invalid address
  - Verify rejected before payment

---

## Risks & Mitigations

### Risk 1: Fulfillment Confirmation Failure After Payment
**Impact:** User paid but nothing ships  
**Mitigation:**
- Retry mechanism with exponential backoff
- Status `paid_pending_fulfillment` + admin alert
- Manual intervention process

### Risk 2: Draft Order Expiration
**Impact:** User pays but draft expired  
**Mitigation:**
- Create drafts at checkout (not earlier)
- Keep checkout flow fast
- Verify draft exists before confirming
- Cleanup job for old drafts

### Risk 3: Price Drift
**Impact:** Quote shows $10 shipping, actual is $12  
**Mitigation:**
- Draft order locks in price
- Short time window between quote and checkout

### Risk 4: No Address for Support
**Impact:** Customer service can't verify shipping address  
**Mitigation:**
- Store only country/postal code (optional)
- Reference provider's order system for full address
- Document process for support team

---

## API Rate Limits to Consider

### Printful Shipping Rates v2
- Default: 120 requests per 60 seconds
- If items > 100: 5 requests per 60 seconds
- 60 second lockout if exceeded

**Mitigation:**
- Cache shipping rates by (country, items hash)
- Rate limit `/quote` endpoint

### Gelato
- TBD - investigate their rate limits

---

## Open Questions

1. **Draft cleanup timing:** 24 hours or shorter (4-6 hours)?
2. **Partial fulfillment:** How to handle if one provider confirms but another fails?
3. **Refunds:** If fulfillment fails after payment, do we auto-refund or manual process?
4. **Address validation:** Should we validate address format before calling providers?
5. **Multi-currency:** Do we need currency conversion if provider only supports certain currencies?

---

## Success Criteria

- [ ] User can enter address and see accurate shipping cost
- [ ] Multiple providers in cart create separate fulfillment orders
- [ ] No shipping addresses stored in our database
- [ ] Payment failure doesn't create orphaned draft orders
- [ ] Fulfillment confirmation failure is retried and alerted
- [ ] Support for both Stripe and future NEAR payments
- [ ] System handles 100+ concurrent checkouts without rate limit issues

---

## Future Enhancements

- [ ] Support multiple shipping options (standard, express)
- [ ] International VAT/tax calculation
- [ ] Save addresses to user preferences (opt-in, encrypted)
- [ ] Bulk order rate discounts
- [ ] Return/exchange flow
