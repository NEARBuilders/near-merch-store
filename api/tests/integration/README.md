# Integration Tests

Comprehensive E2E tests for the checkout flow, payment webhooks, and fulfillment integration.

## Test Files

### 1. `checkout-flow.test.ts`
Tests the complete checkout and payment flow.

**Test Scenarios:**
- ✅ Full checkout → PingPay payment success → order fulfilled
- ✅ Payment failed handling
- ✅ Order lookup by checkout session ID
- ✅ Order status transitions
- ✅ Multiple fulfillment provider support

**Key Flow Tested:**
```
User → Quote → Checkout → PingPay Payment → Webhook → Order Status Update → Printful Confirmation
```

---

### 2. `webhook-signatures.test.ts`
Tests webhook signature verification for security.

**Test Scenarios:**
- ✅ Accept webhooks with valid HMAC-SHA256 signatures
- ✅ Reject webhooks with invalid signatures
- ✅ Reject webhooks with tampered payloads
- ✅ Reject webhooks signed with wrong secret
- ✅ Handle signature length mismatches gracefully
- ✅ HMAC-SHA256 algorithm compliance
- ✅ Replay attack prevention

**Signature Algorithm:**
```typescript
const signaturePayload = `${timestamp}.${JSON.stringify(payload)}`;
const signature = createHmac('sha256', webhookSecret)
  .update(signaturePayload)
  .digest('hex');
```

---

### 3. `printful-webhooks.test.ts`
Tests Printful fulfillment webhook handling.

**Test Scenarios:**
- ✅ `package_shipped` → update order to shipped with tracking
- ✅ `order_canceled` → update order to cancelled
- ✅ `order_put_hold` → log but continue
- ✅ `order_failed` → handle gracefully
- ✅ Missing `external_id` handling
- ✅ Unknown event type handling
- ✅ Multiple tracking numbers

**Webhook Events Handled:**
- `package_shipped` - Order has shipped
- `order_canceled` - Order was cancelled
- `order_put_hold` - Order needs review
- `order_failed` - Fulfillment failed

---

## Running Tests

### Run All Integration Tests
```bash
bun test api/tests/integration
```

### Run Specific Test File
```bash
bun test api/tests/integration/checkout-flow.test.ts
bun test api/tests/integration/webhook-signatures.test.ts
bun test api/tests/integration/printful-webhooks.test.ts
```

### Watch Mode
```bash
bun test --watch api/tests/integration
```

---

## Test Setup

All tests use:
- **In-memory SQLite database** for isolation
- **Vitest** as the test runner
- **Database migrations** run before each test suite
- **Cleanup** after each test to ensure independence

### Configuration

The tests use a test configuration defined in `api/tests/setup.ts`:

```typescript
const TEST_CONFIG = {
  variables: pluginDevConfig.config.variables,
  secrets: {
    API_DATABASE_URL: 'file:./api-test.db',
    API_DATABASE_AUTH_TOKEN: undefined,
  },
};
```

---

## Mock Data

### Test User
```typescript
const TEST_USER = 'test-user.near';
```

### Shipping Address
```typescript
const mockShippingAddress = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  addressLine1: '123 Main St',
  city: 'Los Angeles',
  state: 'CA',
  postCode: '90001',
  country: 'US',
};
```

### Cart Items
```typescript
const mockCartItems = [
  {
    productId: 'prod_123',
    variantId: 'var_456',
    quantity: 2,
  },
];
```

---

## Webhook Payloads

### PingPay Payment Success
```typescript
{
  id: 'whevt_xxx',
  type: 'payment.success',
  created: '2024-01-01T00:00:00Z',
  data: {
    paymentId: 'pay_xxx',
    status: 'SUCCESS',
    amount: '1000000',
    assetId: 'NEAR:USDC',
    payerAddress: 'user.near',
    recipientAddress: 'near-merch-store.near',
    merchantId: 'merch_xxx'
  },
  sessionId: 'session_xxx',
  metadata: {
    orderId: 'order_xxx'
  }
}
```

**Headers:**
```
X-Ping-Timestamp: 1704067200
X-Ping-Signature: <HMAC-SHA256 hex>
X-Ping-Event-Id: whevt_xxx
X-Ping-Event-Type: payment.success
```

### PingPay Payment Failed
```typescript
{
  id: 'whevt_xxx',
  type: 'payment.failed',
  created: '2024-01-01T00:00:00Z',
  data: {
    paymentId: 'pay_xxx',
    status: 'FAILED',
    // ... same structure
  }
}
```

### Printful Package Shipped
```typescript
{
  type: 'package_shipped',
  created: 1697638507,
  retries: 0,
  store: 11229252,
  data: {
    shipment: {
      id: 'shipment_xxx',
      carrier: 'USPS',
      service: 'First-Class Mail',
      tracking_number: '9400111899562537866450',
      tracking_url: 'https://tools.usps.com/...',
      created: 1697638507,
      ship_date: '2023-10-18'
    },
    order: {
      id: 94188292,
      external_id: 'order_xxx',
      store: 11229252,
      status: 'fulfilled'
    }
  }
}
```

---

## Order Status Flow

```
pending
  ↓
draft_created (checkout session created)
  ↓
payment_pending (payment processing)
  ↓
paid (payment confirmed)
  ↓
paid_pending_fulfillment (waiting for provider confirmation)
  ↓
processing (fulfillment order confirmed)
  ↓
printing (items being produced)
  ↓
shipped (package sent with tracking)
  ↓
delivered (package delivered)
```

**Error States:**
- `payment_failed` - Payment could not be processed
- `expired` - Checkout session expired
- `cancelled` - Order was cancelled

---

## Security Notes

### Webhook Signature Verification

All webhooks MUST be verified using HMAC-SHA256:

1. **PingPay**: Uses `X-Ping-Signature` header
   - Payload: `${timestamp}.${body}`
   - Algorithm: HMAC-SHA256
   - Secret: `PING_WEBHOOK_SECRET`

2. **Printful**: Optional signature verification
   - Secret: `PRINTFUL_WEBHOOK_SECRET`
   - Algorithm: HMAC-SHA256

### Replay Attack Prevention

- Verify timestamp is within acceptable window
- Store processed webhook IDs to prevent replay

---

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# .github/workflows/test.yml
- name: Run Integration Tests
  run: bun test api/tests/integration
```

---

## Troubleshooting

### Tests Failing?

1. **Check database migrations**
   ```bash
   cd api && bun run drizzle-kit push
   ```

2. **Clear test database**
   ```bash
   rm -f api/api-test.db
   ```

3. **Verify environment variables**
   - Tests use in-memory config
   - No external API keys needed

### Common Issues

- **"Order not found"**: Ensure test creates order before webhook
- **"Invalid signature"**: Check timestamp and payload format
- **"Database locked"**: Only one test suite should run at a time

---

## Adding New Tests

1. Create test file in `api/tests/integration/`
2. Import test utilities from `../setup`
3. Use `beforeAll`, `afterAll`, `beforeEach` for setup/teardown
4. Follow existing patterns for consistency

Example:
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getPluginClient, runMigrations, teardown } from '../setup';

describe('My New Feature', () => {
  beforeAll(async () => {
    await runMigrations();
  });

  afterAll(async () => {
    await teardown();
  });

  it('should work correctly', async () => {
    const client = await getPluginClient();
    // ... test code
  });
});
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [PingPay Webhook Docs](https://docs.pingpay.io/webhooks)
- [Printful Webhook Docs](https://developers.printful.com/docs/#section/Webhooks)
- [HMAC-SHA256 Spec](https://datatracker.ietf.org/doc/html/rfc2104)
