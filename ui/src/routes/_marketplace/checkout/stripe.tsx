import { useCart } from "@/hooks/use-cart";
import { useCreateCheckout } from "@/integrations/marketplace-api/checkout";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Loader2 } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_marketplace/checkout/stripe")({
  component: StripeCheckoutPage,
});

function StripeCheckoutPage() {
  const navigate = useNavigate();
  const { cartItems, subtotal } = useCart();
  const createCheckout = useCreateCheckout();

  const tax = subtotal * 0.08;
  const total = subtotal + tax;

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate({ to: "/cart" });
      return;
    }

    const initiateCheckout = async () => {
      const firstItem = cartItems[0];
      if (!firstItem) return;

      try {
        const result = await createCheckout.mutateAsync({
          productId: firstItem.productId,
          quantity: firstItem.quantity,
          successUrl: `${window.location.origin}/order-confirmation`,
          cancelUrl: `${window.location.origin}/checkout`,
        });

        window.location.href = result.checkoutUrl;
      } catch (error) {
        console.error("Checkout failed:", error);
      }
    };

    initiateCheckout();
  }, []);

  if (cartItems.length === 0) {
    return null;
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/checkout"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ChevronLeft className="size-4" />
            <span className="text-sm">Back to Checkout</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[672px] mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center">
          <Loader2 className="size-12 animate-spin text-[#635BFF] mb-6" />
          <h1 className="text-xl font-medium mb-2">Redirecting to Stripe...</h1>
          <p className="text-[#717182] text-center">
            You'll be redirected to our secure payment provider to complete your
            purchase.
          </p>

          {createCheckout.isError && (
            <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-800 text-sm">
                There was an error creating your checkout session. Please try
                again.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 underline"
              >
                Retry
              </button>
            </div>
          )}

          <div className="mt-8 w-full max-w-sm border border-[rgba(0,0,0,0.1)] p-4">
            <h3 className="text-sm font-medium mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#717182]">Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717182]">Shipping</span>
                <span>Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717182]">Tax</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="h-px bg-[rgba(0,0,0,0.1)] my-2" />
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
