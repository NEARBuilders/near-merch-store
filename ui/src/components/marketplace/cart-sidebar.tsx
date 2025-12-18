import { Link } from "@tanstack/react-router";
import { X, Plus, Minus, ChevronDown } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { ProductCard } from "@/components/marketplace/product-card";
import { SIZES, requiresSize } from "@/integrations/marketplace-api";

interface CartSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CartSidebar({ isOpen, onClose }: CartSidebarProps) {
  const { cartItems, subtotal, updateQuantity, removeItem, updateSize } =
    useCart();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="fixed right-0 top-0 h-full w-full max-w-[512px] sm:max-w-[512px] bg-background z-50 flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] p-0"
        hideCloseButton={true}
      >
        <div className="border-b border-[rgba(0,0,0,0.1)] px-4 py-4">
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
            <div className="divide-y divide-[rgba(0,0,0,0.1)]">
              {cartItems.map((item) => {
                const needsSize = requiresSize(item.product.category);
                const availableSizes = needsSize ? [...SIZES, "N/A"] : ["N/A"];

                return (
                  <ProductCard
                    key={item.productId}
                    product={item.product}
                    variant="horizontal"
                    hideFavorite
                    className="py-4 border-b border-[rgba(0,0,0,0.1)] last:border-0 hover:shadow-none"
                  >
                    <div className="flex flex-col items-end gap-2 h-full justify-between w-full pl-4 border-l border-border ml-4">
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="size-8 flex items-center justify-center shrink-0"
                        aria-label={`Remove ${item.product.title}`}
                      >
                        <X className="size-4" aria-hidden="true" />
                      </button>
                      <div className="flex flex-col items-end gap-2 w-full">
                        {item.size !== 'N/A' && (
                          <div className="relative w-fit max-w-full">
                            <select
                              value={item.size}
                              onChange={(e) =>
                                updateSize(item.productId, e.target.value)
                              }
                              className="appearance-none bg-muted text-foreground border-none h-9 pl-3.5 pr-8 text-[14px] tracking-[-0.48px] cursor-pointer rounded w-full"
                            >
                              {availableSizes.map((size) => (
                                <option key={size} value={size}>
                                  {size}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="size-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
                              aria-hidden="true"
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-2 gap-2 flex-wrap">
                          <div className="flex items-center border border-border rounded h-[34px]">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, -1)}
                              disabled={item.quantity <= 1}
                              className="size-8 flex items-center justify-center disabled:opacity-50 hover:bg-muted transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="size-4" aria-hidden="true" />
                            </button>
                            <span className="w-8 text-center text-[14px] font-medium tracking-[-0.48px]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.productId, 1)}
                              className="size-8 flex items-center justify-center hover:bg-muted transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                          <div className="text-[16px] font-medium tracking-[-0.48px] whitespace-nowrap">
                            ${(item.product.price * item.quantity).toFixed(2)}
                          </div>
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
          <div className="border-t border-[rgba(0,0,0,0.1)] px-4 pt-4 pb-4">
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
