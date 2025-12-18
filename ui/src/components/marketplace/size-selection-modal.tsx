import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { ProductCard } from "@/components/marketplace/product-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  type Product,
  SIZES,
  requiresSize,
} from "@/integrations/marketplace-api";

interface SizeSelectionModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (productId: string, variantId: string | undefined, size: string) => void;
}

export function SizeSelectionModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: SizeSelectionModalProps) {
  const [selectedSize, setSelectedSize] = useState<string>("M");
  const needsSize = product ? requiresSize(product.category) : false;
  const availableSizes = needsSize ? [...SIZES] : ["N/A"];

  // Reset selected size when modal opens
  useEffect(() => {
    if (isOpen && product) {
      setSelectedSize(needsSize ? "M" : "N/A");
    }
  }, [isOpen, product, needsSize]);

  if (!product) return null;

  const handleAddToCart = () => {
    let selectedVariantId: string | undefined;
    
    if (needsSize && selectedSize !== "N/A") {
      const variant = product.variants?.find((v) => {
        const sizeAttr = v.attributes?.find((attr) => attr.name.toLowerCase() === "size");
        return sizeAttr?.value === selectedSize;
      });
      selectedVariantId = variant?.id;
    } else if (product.variants?.length > 0) {
      selectedVariantId = product.variants[0].id;
    }
    
    onAddToCart(product.id, selectedVariantId, needsSize ? selectedSize : "N/A");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] bg-background z-50 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] mx-4 p-0 border-0 rounded-none gap-0"
        showCloseButton={false}
      >
        <div className="border-b border-[rgba(0,0,0,0.1)] px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="tracking-[-0.48px] text-[16px] mb-1">Select Size</h2>
            <p className="text-[#717182] text-[14px] tracking-[-0.48px]">
              Choose your size for {product.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-8 flex items-center justify-center -mr-2"
            aria-label="Close modal"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="px-6 py-6">
          <ProductCard
            product={product}
            variant="horizontal"
            hideActions
            hideFavorite
            className="mb-6 p-0 shadow-none hover:shadow-none bg-transparent"
          />
          <div className="mb-6">
            <label className="block text-[14px] tracking-[-0.48px] mb-3">
              Size
            </label>
            <div className="grid grid-cols-5 gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`h-12 border transition-colors tracking-[-0.48px] text-[14px] ${selectedSize === size
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground hover:border-foreground"
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 border border-border bg-card text-foreground tracking-[-0.48px] text-[14px] hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 h-10 bg-primary text-primary-foreground tracking-[-0.48px] text-[14px] hover:bg-primary/90 transition-colors"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
