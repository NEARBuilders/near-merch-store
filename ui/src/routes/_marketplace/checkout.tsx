import { useCart } from '@/hooks/use-cart';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ChevronLeft, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/utils/orpc';
import { toast } from 'sonner';

export const Route = createFileRoute("/_marketplace/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { cartItems, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState("");

  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  const nearAmount = (total / 3.5).toFixed(2);

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (cartItems.length === 0) throw new Error('Cart is empty');

      const result = await apiClient.createCheckout({
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          size: item.size,
        })),
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

  const handlePayWithCard = () => {
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

              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.productId} className="flex gap-4">
                    <div className="size-20 bg-[#ececf0] border border-[rgba(0,0,0,0.1)] flex-shrink-0 overflow-hidden">
                      <img
                        src={item.product.images[0].url}
                        alt={item.product.title}
                        className="size-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-base mb-1">{item.product.title}</p>
                      <p className="text-sm text-[#717182]">
                        {item.size !== "N/A" && `Size: ${item.size} • `}Qty:{" "}
                        {item.quantity}
                      </p>
                    </div>
                    <div className="text-base text-right">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[rgba(0,0,0,0.1)] my-6" />

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-[#717182]">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#717182]">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between text-sm">
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

            <div className="mt-6 bg-muted border border-border p-4 flex items-center justify-between gap-4">
              <span className="text-sm">Apply Discount Code</span>
              <input
                type="text"
                placeholder="Enter Code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                className="bg-background border border-border px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-neutral-950 transition-colors w-60"
              />
            </div>
          </div>

          <div>
            <h2 className="text-base font-medium mb-6">
              Choose Payment Method
            </h2>

            <div className="space-y-6">
              <div className="w-full border border-border p-6 text-left relative opacity-50 cursor-not-allowed">
                <div className="flex items-start gap-3">
                  <div className="size-10 bg-[#00ec97] flex items-center justify-center flex-shrink-0">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24">
                      <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" fill="black" />
                    </svg>
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
                disabled={checkoutMutation.isPending}
                className="block w-full border border-border p-6 hover:border-neutral-950 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start gap-3">
                  <div className="size-10 bg-[#d6d3ff] flex items-center justify-center flex-shrink-0">
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
                    : 'Traditional checkout with credit card'
                  }
                </p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
