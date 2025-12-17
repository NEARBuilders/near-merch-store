# Frontend Integration - Shipping & Checkout

## What Changed
Backend now calculates real shipping costs from Printful/Gelato. Frontend needs to collect address before payment and pass shipping costs to checkout.

---

## API Endpoints

### POST /quote
Calculate shipping costs for cart items.

**Request:**
```typescript
{
  items: [{ productId: string; variantId?: string; quantity: number }],
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postCode: string;
    country: string;  // 2-letter ISO (e.g., "US", "CA")
    email: string;
    phone?: string;
  }
}
```

**Response:**
```typescript
{
  subtotal: number;
  shippingCost: number;
  total: number;
  currency: string;
  providerBreakdown: [{
    provider: string;
    selectedShipping: {
      rateId: string;        // Save this for checkout
      rateName: string;
      shippingCost: number;
      minDeliveryDays?: number;
      maxDeliveryDays?: number;
    }
  }]
}
```

### POST /checkout
Create checkout session with shipping costs.

**Request:**
```typescript
{
  items: [{ productId: string; variantId?: string; quantity: number }],
  shippingAddress: ShippingAddress,  // Same as /quote
  selectedRates: Record<string, string>,  // { "printful": "rate_123" }
  shippingCost: number,  // From quote response
  successUrl: string,
  cancelUrl: string
}
```

**Response:**
```typescript
{
  checkoutSessionId: string;
  checkoutUrl: string;
  orderId: string;
}
```

---

## Frontend Changes

### 1. Add types & hooks
**File:** `ui/src/integrations/marketplace-api/checkout.ts`

```typescript
export interface ShippingAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postCode: string;
  country: string;
  email: string;
  phone?: string;
}

export function useGetShippingQuote() {
  return useMutation({
    mutationFn: async (params: {
      items: Array<{ productId: string; variantId?: string; quantity: number }>;
      shippingAddress: ShippingAddress;
    }) => {
      return await apiClient.quote(params);
    },
  });
}

// Update CreateCheckoutInput
export interface CreateCheckoutInput {
  items: Array<{ productId: string; variantId?: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  selectedRates: Record<string, string>;
  shippingCost: number;
  successUrl: string;
  cancelUrl: string;
}
```

### 2. Update checkout page
**File:** `ui/src/routes/_marketplace/checkout.tsx`

**Flow:** Address Form → Quote API → Show Shipping → Checkout API → Stripe

```typescript
const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(null);
const [shippingQuote, setShippingQuote] = useState<QuoteOutput | null>(null);
const quoteMutation = useGetShippingQuote();

// Update total
const shippingCost = shippingQuote?.shippingCost || 0;
const total = subtotal + tax + shippingCost;

// Update checkout
const checkoutMutation = useMutation({
  mutationFn: async () => {
    const selectedRates: Record<string, string> = {};
    shippingQuote.providerBreakdown.forEach(p => {
      selectedRates[p.provider] = p.selectedShipping.rateId;
    });

    return await apiClient.createCheckout({
      items: cartItems.map(item => ({
        productId: item.productId,
        variantId: item.size !== 'N/A' ? item.size : undefined,
        quantity: item.quantity,
      })),
      shippingAddress,
      selectedRates,
      shippingCost: shippingQuote.shippingCost,
      successUrl: `${window.location.origin}/order-confirmation`,
      cancelUrl: `${window.location.origin}/checkout`,
    });
  },
});
```

### 3. Update cart sidebar
**File:** `ui/src/components/marketplace/cart-sidebar.tsx`

Replace hardcoded shipping with:
```typescript
<div className="text-sm text-muted-foreground">
  Shipping calculated at checkout
</div>
```

---

## Checklist

- [ ] Add `ShippingAddress` type and `useGetShippingQuote` hook
- [ ] Update `CreateCheckoutInput` interface
- [ ] Add address form to checkout page
- [ ] Call `/quote` when address submitted
- [ ] Display shipping cost from quote
- [ ] Update checkout mutation to include address + shipping
- [ ] Replace "Free" shipping text in cart

---

## Notes

- Addresses NOT stored in our database (privacy)
- Draft orders auto-canceled after 24 hours if abandoned
- Multi-provider carts handled automatically
