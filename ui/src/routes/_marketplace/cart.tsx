import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Minus, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { ProductCard } from '@/components/marketplace/product-card';
import { SIZES } from '@/integrations/marketplace-api';

export const Route = createFileRoute('/_marketplace/cart')({
  component: CartPage,
});

function CartPage() {
  const { cartItems, subtotal, updateQuantity, updateSize, removeItem } = useCart();

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

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <h1 className="text-2xl font-medium tracking-[-0.48px] mb-8">Shopping Cart</h1>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-6">Your cart is empty</p>
            <Link to="/">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="divide-y divide-border">
                {cartItems.map((item) => (
                  <ProductCard
                    key={item.productId}
                    product={item.product}
                    variant="horizontal"
                    hideFavorite
                    hidePrice
                    className="py-6 border-b border-border last:border-0 hover:shadow-none bg-transparent gap-4 md:gap-6"
                    actionSlot={
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="size-8 flex items-center justify-center shrink-0 hover:bg-muted transition-colors rounded-full md:rounded-none"
                        aria-label={`Remove ${item.product.title}`}
                      >
                        <X className="size-4" />
                      </button>
                    }
                  >
                    <div className="w-full flex flex-col gap-4 mt-2">
                      {item.size !== 'N/A' && (
                        <div className="relative mt-3 w-full max-w-[200px] mx-auto md:mx-0">
                          <select
                            value={item.size}
                            onChange={(e) => updateSize(item.productId, e.target.value)}
                            className="appearance-none bg-muted text-foreground border-none h-9 pl-3.5 pr-8 text-sm tracking-[-0.48px] cursor-pointer rounded w-full"
                          >
                            {SIZES.map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <ChevronDown className="size-4 text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row items-center md:justify-between mt-4 gap-4 w-full">
                        <div className="flex items-center border border-border rounded h-[34px]">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="size-8 flex items-center justify-center disabled:opacity-50 hover:bg-muted transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-8 text-center text-base tracking-[-0.48px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="size-8 flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>

                        <div className="text-lg md:text-base font-medium md:font-normal tracking-[-0.48px] whitespace-nowrap">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </ProductCard>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="border border-border p-4 md:p-6 sticky top-24">
                <h2 className="text-lg font-medium tracking-[-0.48px] mb-6">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>${(subtotal * 0.08).toFixed(2)}</span>
                  </div>
                </div>

                <div className="h-px bg-border mb-4" />

                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-medium">Total</span>
                  <span className="text-base font-medium">
                    ${(subtotal + subtotal * 0.08).toFixed(2)}
                  </span>
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
