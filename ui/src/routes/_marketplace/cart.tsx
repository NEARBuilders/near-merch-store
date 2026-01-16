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
    <div className="bg-background min-h-screen pt-32">
      <div className="container-app mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Block */}
          <Link
            to="/"
            className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Title Block */}
          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Shopping Cart
            </h1>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 text-center">
            <p className="text-foreground/90 dark:text-muted-foreground text-lg mb-6">
              Your cart is empty
            </p>
            <Link to="/">
              <Button className="bg-[#00EC97] text-black hover:bg-[#00d97f] h-10 px-6">
                Continue Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Cart Items Block */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8 space-y-6">
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
                    <div key={item.variantId} className="pb-6 border-b border-border/60 last:border-0 last:pb-0">
                    <ProductCard
                      product={item.product}
                      variant="horizontal"
                      hideFavorite
                      hidePrice
                        className="hover:shadow-none bg-transparent gap-4 md:gap-6"
                      actionSlot={
                        <button
                          onClick={() => removeItem(item.variantId)}
                            className="size-8 flex items-center justify-center shrink-0 hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97] transition-colors rounded-lg"
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
                                className="size-5 rounded-full border border-border"
                                style={{ backgroundColor: colorHex }}
                              />
                            )}
                            <span className="text-sm text-foreground/90 dark:text-muted-foreground">
                              {item.color}
                            </span>
                          </div>
                        )}

                        {item.size !== "N/A" && item.size !== "One size" && (
                          <div className="text-sm text-foreground/90 dark:text-muted-foreground">
                            Size: {item.size}
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-between gap-3 w-full">
                          <div className="flex items-center border border-border/60 rounded-lg h-[34px] w-full sm:w-auto bg-background/40">
                            <button
                              onClick={() => updateQuantity(item.variantId, -1)}
                              className="size-8 flex items-center justify-center disabled:opacity-50 hover:bg-background/60 hover:text-[#00EC97] transition-colors rounded-l-lg"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4" />
                            </button>
                            <span className="flex-1 sm:w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.variantId, 1)}
                              className="size-8 flex items-center justify-center hover:bg-background/60 hover:text-[#00EC97] transition-colors rounded-r-lg"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4" />
                            </button>
                          </div>

                          <div className="text-lg sm:text-base font-medium tracking-tight whitespace-nowrap text-center sm:text-right">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </ProductCard>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary Block */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-6 md:p-8 sticky top-24">
                <h2 className="text-lg font-medium tracking-tight mb-6">
                  Order Summary
                </h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/90 dark:text-muted-foreground">Subtotal</span>
                    <span className="text-foreground">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/90 dark:text-muted-foreground">Shipping</span>
                    <span className="text-foreground/90 dark:text-muted-foreground">Calculated at checkout</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground/90 dark:text-muted-foreground">Tax</span>
                    <span className="text-foreground/90 dark:text-muted-foreground">Calculated at checkout</span>
                  </div>
                </div>

                <div className="h-px bg-border/60 mb-4" />

                <div className="flex justify-between items-center mb-2">
                  <span className="text-base font-semibold">Estimated Total</span>
                  <span className="text-base font-semibold">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-6 text-sm text-foreground/90 dark:text-muted-foreground">
                  <span>NEAR Equivalent</span>
                  <span>{isLoadingNearPrice ? '...' : `${nearAmount} NEAR`}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <Link to="/" className="w-full">
                    <Button 
                      variant="outline" 
                      className="w-full border-border/60 hover:border-[#00EC97] hover:text-[#00EC97] h-10"
                    >
                      <ArrowLeft className="size-4 mr-2" />
                      Continue Shopping
                    </Button>
                  </Link>
                <Link to="/checkout" data-testid="checkout-link">
                    <Button className="w-full bg-[#00EC97] text-black hover:bg-[#00d97f] h-10" data-testid="checkout-button">
                    Checkout
                  </Button>
                </Link>
                </div>

                <p className="text-foreground/90 dark:text-muted-foreground text-xs text-center mt-4">
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
