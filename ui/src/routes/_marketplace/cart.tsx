import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Minus, Plus, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { SIZES } from '@/integrations/marketplace-api';

export const Route = createFileRoute('/_marketplace/cart')({
  component: CartPage,
});

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, subtotal, updateQuantity, updateSize, removeItem } = useCart();

  return (
    <div className="bg-white min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
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
            <p className="text-[#717182] text-lg mb-6">Your cart is empty</p>
            <Link to="/">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-12">
            <div className="lg:col-span-2">
              <div className="divide-y divide-[rgba(0,0,0,0.1)]">
                {cartItems.map((item) => (
                  <div key={item.productId} className="py-6 flex gap-4 items-start">
                    <div className="bg-[#ececf0] rounded size-24 shrink-0 overflow-hidden">
                      <img
                        src={item.product.image}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0 pr-4">
                          <Link
                            to="/products/$productId"
                            params={{ productId: item.productId }}
                            className="hover:text-[#00ec97] transition-colors"
                          >
                            <h3 className="text-base tracking-[-0.48px] truncate">
                              {item.product.name}
                            </h3>
                          </Link>
                          <p className="text-[#717182] text-sm tracking-[-0.48px] mt-1">
                            {item.product.category}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.productId)}
                          className="size-8 flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors"
                          aria-label={`Remove ${item.product.name}`}
                        >
                          <X className="size-4" />
                        </button>
                      </div>

                      {item.size !== 'N/A' && (
                        <div className="relative inline-block mt-3">
                          <select
                            value={item.size}
                            onChange={(e) => updateSize(item.productId, e.target.value)}
                            className="appearance-none bg-[#f3f3f5] border-none h-9 px-3.5 pr-9 text-sm tracking-[-0.48px] cursor-pointer"
                          >
                            {SIZES.map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                          <ChevronDown className="size-4 text-[#717182] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50" />
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center border border-[rgba(0,0,0,0.1)] rounded h-[34px]">
                          <button
                            onClick={() => updateQuantity(item.productId, -1)}
                            className="size-8 flex items-center justify-center disabled:opacity-50"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="size-4" />
                          </button>
                          <span className="w-8 text-center text-base tracking-[-0.48px]">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, 1)}
                            className="size-8 flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            <Plus className="size-4" />
                          </button>
                        </div>

                        <div className="text-base tracking-[-0.48px]">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="border border-[rgba(0,0,0,0.1)] p-6 sticky top-24">
                <h2 className="text-lg font-medium tracking-[-0.48px] mb-6">Order Summary</h2>

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
                    <span>${(subtotal * 0.08).toFixed(2)}</span>
                  </div>
                </div>

                <div className="h-px bg-[rgba(0,0,0,0.1)] mb-4" />

                <div className="flex justify-between items-center mb-6">
                  <span className="text-base font-medium">Total</span>
                  <span className="text-base font-medium">
                    ${(subtotal + subtotal * 0.08).toFixed(2)}
                  </span>
                </div>

                <Link to="/checkout">
                  <Button className="w-full bg-neutral-950 hover:bg-neutral-800">
                    Checkout
                  </Button>
                </Link>

                <p className="text-[#717182] text-xs tracking-[-0.48px] text-center mt-4">
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
