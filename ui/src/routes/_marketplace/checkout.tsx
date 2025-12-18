import { useCart } from '@/hooks/use-cart';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ProductCard } from '@/components/marketplace/product-card';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { toast } from 'sonner';
import { authClient } from '@/lib/auth-client';
import { Checkbox } from '@/components/ui/checkbox';
import { NearMark } from '@/components/near-mark';
import { useGetShippingQuote, type QuoteOutput } from '@/integrations/marketplace-api/checkout';

export const Route = createFileRoute("/_marketplace/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cartItems, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [shippingQuote, setShippingQuote] = useState<QuoteOutput | null>(null);
  const navigate = useNavigate();
  const getShippingQuoteMutation = useGetShippingQuote();

  const shippingCost = shippingQuote?.shippingCost || 0;
  const tax = subtotal * 0.08;
  const total = subtotal + tax + shippingCost;
  const nearAmount = (total / 3.5).toFixed(2);

  const hardcodedAddress = {
    firstName: 'Placeholder',
    lastName: 'User',
    addressLine1: '123 Main St',
    city: 'Los Angeles',
    state: 'CA',
    postCode: '90001',
    country: 'US',
    email: 'user@example.com',
  };

  useEffect(() => {
    if (cartItems.length > 0 && !shippingQuote && !getShippingQuoteMutation.isPending) {
      getShippingQuoteMutation.mutate(
        {
          items: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          })),
          shippingAddress: hardcodedAddress,
        },
        {
          onSuccess: (data) => {
            setShippingQuote(data);
          },
          onError: (error: Error) => {
            toast.error('Failed to get shipping quote', {
              description: error.message || 'Using default shipping cost',
            });
          },
        }
      );
    }
  }, [cartItems.length]);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) throw new Error('Cart is empty');
      if (!shippingQuote) throw new Error('Shipping quote not loaded');

      const selectedRates: Record<string, string> = {};
      shippingQuote.providerBreakdown.forEach((provider) => {
        selectedRates[provider.provider] = provider.selectedShipping.rateId;
      });

      const result = await apiClient.createCheckout({
        items: cartItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        shippingAddress: hardcodedAddress,
        selectedRates,
        shippingCost: shippingQuote.shippingCost,
        successUrl: `${window.location.origin}/order-confirmation`,
        cancelUrl: `${window.location.origin}/checkout`,
      });
      return result;
    },
    onSuccess: (data) => {
      if (data?.checkoutUrl) {
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

  const handlePayWithCard = async () => {
    // Check if user is authenticated before proceeding with checkout
    const { data: session } = await authClient.getSession();
    if (!session?.user) {
      navigate({
        to: "/login",
        search: {
          redirect: "/checkout",
        },
      });
      return;
    }

    checkoutMutation.mutate();
  };

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/cart"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="size-4" />
            <span className="text-sm">Back to Cart</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-2xl font-medium mb-8 tracking-[-0.48px]">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="border border-[rgba(0,0,0,0.1)] p-8">
            <div className="mb-6">
              <h2 className="text-base font-medium mb-6">Order Summary</h2>

              <div className="divide-y divide-border/50">
                {cartItems.map((item) => (
                  <ProductCard
                    key={item.productId}
                    product={item.product}
                    variant="horizontal"
                    hideFavorite
                    hideActions
                    hidePrice
                    className="p-0 py-4 first:pt-0 last:pb-0 border-none shadow-none gap-4 bg-transparent"
                    actionSlot={
                      <div className="text-base text-right">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    }
                  >
                    <div className="text-base text-right">
                      {item.size !== "N/A" && `Size: ${item.size} • `}Qty:{" "}
                      {item.quantity}
                    </div>
                  </ProductCard>
                ))}
              </div>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] my-6" />

            <div className="space-y-0 divide-y divide-border/50 mb-6">
              <div className="flex justify-between text-sm py-3 first:pt-0">
                <span className="text-[#717182]">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm py-3">
                <span className="text-[#717182]">Shipping</span>
                <span>
                  {getShippingQuoteMutation.isPending ? (
                    'Calculating...'
                  ) : shippingCost > 0 ? (
                    `$${shippingCost.toFixed(2)}`
                  ) : (
                    'Free'
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm py-3 last:pb-0">
                <span className="text-[#717182]">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] mb-3" />

            <div className="flex justify-between items-start">
              <span className="text-base font-medium">Total</span>
              <div className="text-right">
                <p className="text-base font-medium">${total.toFixed(2)}</p>
                <p className="text-sm text-[#717182]">{nearAmount} NEAR</p>
              </div>
            </div>

            <div className="mt-6 bg-muted border border-border p-4 flex flex-col sm:flex-row sm:items-center items-start justify-between gap-4">
              <span className="text-sm">Apply Discount Code</span>
              <input
                type="text"
                placeholder="Enter Code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="bg-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neutral-950 transition-colors w-full sm:w-60"
              />
            </div>
          </div>

          <div>
            <div className="border border-border p-6 mb-6">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked: boolean) => setAcceptedTerms(checked)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-relaxed cursor-pointer select-none"
                >
                  By checking this box, you agree to our{' '}
                  <Link
                    to="/terms-of-service"
                    className="underline hover:text-neutral-950 transition-colors"
                  >
                    Terms of Service
                  </Link>
                </label>
              </div>
            </div>

            {acceptedTerms && (
              <>
                <h2 className="text-base font-medium mb-6">
                  Choose Payment Method
                </h2>

                <div className="space-y-6">
                  <div className="w-full border border-border p-6 text-left relative opacity-50 cursor-not-allowed">
                    <div className="flex items-start gap-3">
                      <div className="size-10 bg-[#00ec97] flex items-center justify-center shrink-0">
                        <NearMark className="size-6 text-black" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-base">Pay with NEAR</p>
                          <span className="bg-neutral-950 text-white text-[10px] px-2 py-0.5 uppercase tracking-wider">
                            COMING SOON
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Recommended
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-4">
                      Instant checkout with your NEAR wallet
                    </p>
                  </div>

                  <button
                    onClick={handlePayWithCard}
                    disabled={checkoutMutation.isPending || getShippingQuoteMutation.isPending || !shippingQuote}
                    className="block w-full border border-border p-6 hover:border-neutral-950 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-3">
                      <div className="size-10 bg-[#d6d3ff] flex items-center justify-center shrink-0">
                        {checkoutMutation.isPending ? (
                          <div className="animate-spin size-5 border-2 border-[#635BFF]/30 border-t-[#635BFF] rounded-full" />
                        ) : (
                          <CreditCard className="size-6 text-[#635BFF]" />
                        )}
                      </div>

                      <div className="flex-1">
                        <p className="text-base mb-1">
                          {checkoutMutation.isPending ? 'Redirecting...' : 'Pay with Card'}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-[#635bff]">
                          <span>Powered by</span>
                          <span className="font-semibold">stripe</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-[#717182] mt-4">
                      {checkoutMutation.isPending
                        ? 'Please wait...'
                        : getShippingQuoteMutation.isPending
                          ? 'Loading shipping rates...'
                          : 'Traditional checkout with credit card'
                      }
                    </p>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
