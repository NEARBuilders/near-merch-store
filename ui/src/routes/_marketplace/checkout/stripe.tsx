import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { toast } from 'sonner';
import type { ShippingAddress } from '@/integrations/marketplace-api/checkout';

interface CheckoutSearchParams {
  shippingRateId?: string;
  shippingAddress?: string;
}

export const Route = createFileRoute('/_marketplace/checkout/stripe')({
  validateSearch: (search: Record<string, unknown>): CheckoutSearchParams => ({
    shippingRateId: typeof search.shippingRateId === 'string' ? search.shippingRateId : undefined,
    shippingAddress: typeof search.shippingAddress === 'string' ? search.shippingAddress : undefined,
  }),
  component: StripeCheckoutPage,
});

const SHIPPING_RATES: Record<string, { name: string; rate: number; deliveryDays: string }> = {
  standard: { name: 'Standard Shipping', rate: 5.99, deliveryDays: '5-10 business days' },
  express: { name: 'Express Shipping', rate: 12.99, deliveryDays: '2-4 business days' },
};

function StripeCheckoutPage() {
  const { cartItems, subtotal, clearCart } = useCart();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const search = Route.useSearch();

  // Parse shipping info from search params
  const shippingAddress: ShippingAddress | null = useMemo(() => {
    if (search.shippingAddress) {
      try {
        return JSON.parse(search.shippingAddress);
      } catch {
        return null;
      }
    }
    return null;
  }, [search.shippingAddress]);

  const selectedRate = search.shippingRateId ? SHIPPING_RATES[search.shippingRateId] : null;
  const shippingCost = selectedRate?.rate ?? 0;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingCost + tax;

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) throw new Error('Cart is empty');

      const result = await apiClient.createCheckout({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        successUrl: `${window.location.origin}/order-confirmation`,
        cancelUrl: `${window.location.origin}/checkout`,
      });
      return result;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
        setIsRedirecting(true);
        clearCart();
        window.location.href = data.checkoutUrl;
      } else {
        toast.error('Failed to create checkout session');
      }
    },
    onError: (error: Error) => {
      toast.error('Checkout failed', {
        description: error.message || 'Please try again later',
      });
    },
  });

  const handleCheckout = () => {
    checkoutMutation.mutate();
  };

  if (cartItems.length === 0) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Your cart is empty</h1>
          <Link to="/" className="text-[#00ec97] hover:underline">
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen font-sans">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[800px] mx-auto px-8 py-4">
          <Link to="/checkout" className="flex items-center gap-2 hover:opacity-70 transition-opacity">
            <ChevronLeft className="size-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[800px] mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-lg font-medium mb-4">Order Summary</h2>

            <div className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex gap-3">
                  <div className="size-12 bg-[#ececf0] flex-shrink-0 overflow-hidden">
                    <img src={item.product.images[0]?.url} alt={item.product.title} className="size-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{item.product.title}</p>
                    <p className="text-xs text-[#717182]">
                      {item.size !== 'N/A' && `Size: ${item.size} • `}Qty: {item.quantity}
                    </p>
                  </div>
                  <div className="text-sm">${(item.product.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.1)]">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#717182]">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#717182]">Shipping</span>
                <span>${shippingCost.toFixed(2)}</span>
              </div>
              {selectedRate && (
                <div className="text-xs text-[#717182] mb-2">
                  {selectedRate.name} ({selectedRate.deliveryDays})
                </div>
              )}
              <div className="flex justify-between text-sm mb-2">
                <span className="text-[#717182]">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t border-[rgba(0,0,0,0.1)]">
                <span>Total due</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Shipping Address Display */}
            {shippingAddress && (
              <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.1)]">
                <h3 className="text-sm font-medium mb-2">Shipping to:</h3>
                <div className="text-sm text-[#717182]">
                  <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                  <p>{shippingAddress.addressLine1}</p>
                  {shippingAddress.addressLine2 && <p>{shippingAddress.addressLine2}</p>}
                  <p>{shippingAddress.city}, {shippingAddress.state} {shippingAddress.postCode}</p>
                  <p>{shippingAddress.country}</p>
                  {shippingAddress.email && <p className="mt-2">{shippingAddress.email}</p>}
                  {shippingAddress.phone && <p>{shippingAddress.phone}</p>}
                </div>
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-medium mb-4">Pay with Stripe</h2>

            <div className="bg-[#f6f6f6] border border-[rgba(0,0,0,0.1)] p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 bg-[#d6d3ff] flex items-center justify-center">
                  <svg className="size-6" viewBox="0 0 24 24" fill="none">
                    <path d="M4 10h16M4 14h16M20 6H4a2 2 0 00-2 2v8a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2z" stroke="#635BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Secure Checkout</p>
                  <p className="text-xs text-[#717182]">Powered by Stripe</p>
                </div>
              </div>

              <p className="text-sm text-[#717182] mb-4">
                You'll be redirected to Stripe's secure checkout page to complete your payment with:
              </p>

              <ul className="text-sm text-[#717182] space-y-2 mb-4">
                <li className="flex items-center gap-2">
                  <svg className="size-4 text-[#635BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Credit/Debit Cards (Visa, Mastercard, Amex)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="size-4 text-[#635BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Apple Pay & Google Pay
                </li>
                <li className="flex items-center gap-2">
                  <svg className="size-4 text-[#635BFF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Bank transfers & more
                </li>
              </ul>
            </div>

            <Button
              onClick={handleCheckout}
              disabled={checkoutMutation.isPending || isRedirecting}
              className="w-full bg-[#635BFF] hover:bg-[#5850EC] disabled:opacity-50 h-12 text-base"
            >
              {checkoutMutation.isPending || isRedirecting ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin size-4 border-2 border-white/30 border-t-white rounded-full" />
                  {isRedirecting ? 'Redirecting to Stripe...' : 'Creating checkout...'}
                </span>
              ) : (
                `Pay $${total.toFixed(2)}`
              )}
            </Button>

            <p className="text-xs text-center text-[#717182] mt-4">
              By paying, you agree to our Terms and Privacy Policy.
            </p>

            <div className="flex items-center justify-center gap-2 text-xs text-[#717182] mt-4">
              <span>Powered by</span>
              <span className="text-[#635BFF] font-semibold">stripe</span>
              <span className="mx-2">|</span>
              <span>🔒 Secure SSL</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
