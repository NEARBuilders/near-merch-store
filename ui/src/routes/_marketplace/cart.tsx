import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useNearPrice } from "@/hooks/use-near-price";
import {
  COLOR_MAP,
  getAttributeHex
} from "@/lib/product-utils";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, X } from "lucide-react";

export const Route = createFileRoute("/_marketplace/cart")({
  component: CartPage,
});

function CartPage() {
  const { cartItems, subtotal, updateQuantity, removeItem } = useCart();
  const { nearPrice, isLoading: isLoadingNearPrice } = useNearPrice();
  const nearAmount = (subtotal / nearPrice).toFixed(2);

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-[-0.48px]">Continue Shopping</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4 md:py-8">
        <h1 className="text-2xl font-medium tracking-[-0.48px] mb-8">
          Shopping Cart
        </h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-6">
              Your cart is empty
            </p>
            <Link to="/">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <div className="divide-y divide-border">
                {cartItems.map((item) => {
                  const availableVariants = item.product.variants || [];
                  const selectedVariant = availableVariants.find(
                    (v) => v.id === item.variantId
                  );

                  const apiHex = getAttributeHex(
                    selectedVariant?.attributes,
                    "Color"
                  );
                  const colorHex =
                    apiHex ||
                    (item.color && item.color !== "N/A"
                      ? COLOR_MAP[item.color]
                      : null) ||
                    null;

                  return (
                    <ProductCard
                      key={item.variantId}
                      product={item.product}
                      variant="horizontal"
                      hideFavorite
                      hidePrice
                      className="py-6 border-b border-border last:border-0 hover:shadow-none bg-transparent gap-4 md:gap-6"
                      actionSlot={
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="size-8 flex items-center justify-center shrink-0 hover:bg-muted transition-colors rounded-full md:rounded-none"
                          aria-label={`Remove ${item.product.title}`}
                        >
                          <X className="size-4" />
                        </button>
                      }
                    >
                      <div className="w-full flex flex-col gap-3 mt-2">
                        {item.color && item.color !== "N/A" && (
                          <div className="flex items-center gap-2">
                            {colorHex && (
                              <div
                                className="size-5 rounded-full border border-black/10 dark:border-white/20"
                                style={{ backgroundColor: colorHex }}
                              />
                            )}
                            <span className="text-sm text-muted-foreground">
                              {item.color}
                            </span>
                          </div>
                        )}

                        {item.size !== "N/A" && item.size !== "One size" && (
                          <div className="text-sm text-muted-foreground">
                            Size: {item.size}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 w-full">
                          <div className="flex items-center border border-border rounded h-[34px] w-full sm:w-auto">
                            <button
                              onClick={() => updateQuantity(item.variantId, -1)}
                              className="size-8 flex items-center justify-center disabled:opacity-50 hover:bg-muted transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="flex-1 sm:w-8 text-center text-base tracking-[-0.48px]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variantId, 1)}
                              className="size-8 flex items-center justify-center hover:bg-muted transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>

                          <div className="text-lg sm:text-base font-medium tracking-[-0.48px] whitespace-nowrap text-center sm:text-right">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </ProductCard>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="border border-border p-4 md:p-6 sticky top-24">
                <h2 className="text-lg font-medium tracking-[-0.48px] mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="text-muted-foreground">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="text-muted-foreground">Calculated at checkout</span>
                  </div>
                </div>

                <div className="h-px bg-border mb-4" />

                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-medium">Estimated Total</span>
                  <span className="text-base font-medium">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-6 text-sm text-muted-foreground">
                  <span>NEAR Equivalent</span>
                  <span>{isLoadingNearPrice ? '...' : `${nearAmount} NEAR`}</span>
                </div>

                <Link to="/checkout">
                  <Button className="w-full bg-primary text-primary-foreground dark:bg-white dark:text-black dark:hover:bg-white/90 hover:bg-primary/90">
                    Checkout
                  </Button>
                </Link>

                <p className="text-muted-foreground text-xs tracking-[-0.48px] text-center mt-4">
                  Shipping and taxes calculated at checkout
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
