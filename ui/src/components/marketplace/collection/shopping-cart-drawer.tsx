import { Link } from "@tanstack/react-router";
import { X, Plus, Minus, ChevronDown } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { SIZES, requiresSize } from "@/integrations/marketplace-api";

interface ShoppingCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCartDrawer({ isOpen, onClose }: ShoppingCartDrawerProps) {
  const { cartItems, subtotal, updateQuantity, removeItem, updateSize } =
    useCart();

  const hasItems = cartItems.length > 0;
  const isCartEmpty = cartItems.length === 0;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="fixed right-0 top-0 h-full w-full max-w-[512px] sm:max-w-[512px] bg-white z-50 flex flex-col shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] p-0"
      >
        <DrawerHeader onClose={onClose} />
        <DrawerContent 
          cartItems={cartItems} 
          isCartEmpty={isCartEmpty}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          updateSize={updateSize}
        />
        {hasItems && (
          <DrawerFooter 
            subtotal={subtotal} 
            onClose={onClose} 
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface DrawerHeaderProps {
  onClose: () => void;
}

function DrawerHeader({ onClose }: DrawerHeaderProps) {
  return (
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
      <p className="text-[#717182] text-[14px] tracking-[-0.48px]">
        Review your items and proceed to checkout
      </p>
    </div>
  );
}

interface DrawerContentProps {
  cartItems: any[];
  isCartEmpty: boolean;
  updateQuantity: (productId: string, delta: number) => void;
  removeItem: (productId: string) => void;
  updateSize: (productId: string, size: string) => void;
}

function DrawerContent({ 
  cartItems, 
  isCartEmpty,
  updateQuantity,
  removeItem,
  updateSize 
}: DrawerContentProps) {
  if (isCartEmpty) {
    return (
      <div className="flex-1 overflow-y-auto px-4">
        <div className="py-8 text-center text-[#717182]">
          <p className="text-[14px] tracking-[-0.48px]">
            Your cart is empty
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4">
      <div className="divide-y divide-[rgba(0,0,0,0.1)]">
        {cartItems.map((item) => (
          <CartItemRow
            key={item.productId}
            item={item}
            onUpdateQuantity={updateQuantity}
            onRemove={removeItem}
            onUpdateSize={updateSize}
          />
        ))}
      </div>
    </div>
  );
}

interface CartItemRowProps {
  item: any;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
  onUpdateSize: (productId: string, size: string) => void;
}

function CartItemRow({ item, onUpdateQuantity, onRemove, onUpdateSize }: CartItemRowProps) {
  const needsSize = requiresSize(item.product.category);
  const sizeOptions = needsSize ? [...SIZES, "N/A"] : ["N/A"];

  return (
    <div className="py-4 flex gap-4 items-start">
      <div className="bg-[#ececf0] rounded size-20 shrink-0 overflow-hidden">
        <img
          src={item.product.image}
          alt={item.product.name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-[16px] tracking-[-0.48px] truncate">
              {item.product.name}
            </h3>
            <p className="text-[#717182] text-[14px] tracking-[-0.48px] mt-1">
              {item.product.category}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onRemove(item.productId)}
            className="size-8 flex items-center justify-center shrink-0"
            aria-label={`Remove ${item.product.name}`}
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="relative inline-block mt-3">
          <select
            value={item.size}
            onChange={(e) => onUpdateSize(item.productId, e.target.value)}
            className="appearance-none bg-[#f3f3f5] border-none h-9 px-3.5 pr-9 text-[14px] tracking-[-0.48px] cursor-pointer rounded"
          >
            {sizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <ChevronDown
            className="size-4 text-[#717182] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"
            aria-hidden="true"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-[rgba(0,0,0,0.1)] rounded h-[34px]">
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.productId, -1)}
              disabled={item.quantity <= 1}
              className="size-8 flex items-center justify-center disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="w-8 text-center text-[16px] tracking-[-0.48px]">
              {item.quantity}
            </span>
            <button
              type="button"
              onClick={() => onUpdateQuantity(item.productId, 1)}
              className="size-8 flex items-center justify-center"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="text-[16px] tracking-[-0.48px]">
            ${(item.product.price * item.quantity).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DrawerFooterProps {
  subtotal: number;
  onClose: () => void;
}

function DrawerFooter({ subtotal, onClose }: DrawerFooterProps) {
  return (
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
        className="w-full bg-neutral-950 text-white h-9 flex items-center justify-center tracking-[-0.48px] text-[14px] hover:bg-neutral-800 transition-colors"
      >
        Checkout
      </Link>
      <p className="text-[#717182] text-[12px] tracking-[-0.48px] text-center mt-4">
        Shipping and taxes calculated at checkout
      </p>
    </div>
  );
}
