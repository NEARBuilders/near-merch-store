import { ProductCard } from "@/components/marketplace/product-card";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import {
  COLOR_MAP,
  getAttributeHex
} from "@/lib/product-utils";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, X } from "lucide-react";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cartItems, subtotal, updateQuantity, removeItem } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="fixed right-0 top-0 h-full w-full max-w-[512px] sm:max-w-[512px] bg-background z-50 flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] p-0"
        hideCloseButton={true}
      >
        <div className="border-b border-border px-4 py-4">
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex-1">
              <h2 className="tracking-[-0.48px] text-[16px]">Shopping Cart</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-8 flex items-center justify-center -mr-2"
              aria-label="Close cart"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-muted-foreground text-[14px] tracking-[-0.48px]">
            Review your items and proceed to checkout
          </p>
        </div>
        <div className="flex-1 overflow-y-auto px-4">
          {cartItems.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p className="text-[14px] tracking-[-0.48px]">
                Your cart is empty
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
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
                    className="border-b border-border pb-4 last:border-0 hover:shadow-none p-0"
                    actionSlot={
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="size-8 flex items-center justify-center shrink-0 hover:bg-muted transition-colors rounded"
                        aria-label={`Remove ${item.product.title}`}
                      >
                        <X className="size-4" aria-hidden="true" />
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
                            type="button"
                            onClick={() => updateQuantity(item.variantId, -1)}
                            disabled={item.quantity <= 1}
                            className="size-8 flex items-center justify-center disabled:opacity-50 hover:bg-muted transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" aria-hidden="true" />
                          </button>
                          <span className="flex-1 sm:w-8 text-center text-[14px] font-medium tracking-[-0.48px]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.variantId, 1)}
                            className="size-8 flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" aria-hidden="true" />
                          </button>
                        </div>

                        <div className="text-base font-medium tracking-[-0.48px] whitespace-nowrap text-center sm:text-right">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </ProductCard>
                );
              })}
            </div>
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="border-t border-border px-4 pt-4 pb-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[16px] tracking-[-0.48px]">Subtotal</span>
              <span className="text-[16px] tracking-[-0.48px]">
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <Link
              to="/checkout"
              onClick={onClose}
              className="w-full bg-primary text-primary-foreground dark:bg-white dark:text-black dark:hover:bg-white/90 h-9 flex items-center justify-center tracking-[-0.48px] text-[14px] hover:bg-primary/90 transition-colors"
            >
              Checkout
            </Link>
            <p className="text-muted-foreground text-[12px] tracking-[-0.48px] text-center mt-4">
              Shipping and taxes calculated at checkout
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
