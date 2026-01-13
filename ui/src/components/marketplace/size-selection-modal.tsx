import { ProductCard } from "@/components/marketplace/product-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type Product, requiresSize } from "@/integrations/api";
import {
  COLOR_MAP,
  getAttributeHex,
  getOptionValue,
} from "@/lib/product-utils";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

interface SizeSelectionModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (
    productId: string,
    variantId: string,
    size: string,
    color: string
  ) => void;
}

export function SizeSelectionModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
}: SizeSelectionModalProps) {
  const colorOption = product?.options?.find((opt) => opt.name === "Color");
  const sizeOption = product?.options?.find((opt) => opt.name === "Size");
  const orderedColors = colorOption?.values || [];
  const orderedSizes = sizeOption?.values || [];

  const [selectedColor, setSelectedColor] = useState<string>(
    orderedColors[0] || ""
  );
  const [selectedSize, setSelectedSize] = useState<string>(
    orderedSizes.includes("M") ? "M" : orderedSizes[0] || ""
  );

  const needsSize = product ? requiresSize(product.category) : false;
  const availableSizes =
    needsSize && orderedSizes.length > 0 ? orderedSizes : ["N/A"];

  useEffect(() => {
    if (isOpen && product) {
      const colors =
        product.options?.find((opt) => opt.name === "Color")?.values || [];
      const sizes =
        product.options?.find((opt) => opt.name === "Size")?.values || [];

      setSelectedColor(colors[0] || "");
      setSelectedSize(sizes.includes("M") ? "M" : sizes[0] || "");
    }
  }, [isOpen, product]);

  if (!product) return null;

  const availableVariants = product.variants || [];

  const availableSizesForColor = availableSizes.filter((size) => {
    if (size === "N/A") return true;
    return availableVariants.some((v) => {
      const vSize = getOptionValue(v.attributes, "Size");
      const vColor = getOptionValue(v.attributes, "Color");
      return vSize === size && vColor === selectedColor && v.availableForSale;
    });
  });

  const handleAddToCart = () => {
    let selectedVariantId: string | undefined;
    let finalColor = selectedColor || "N/A";
    let finalSize = needsSize ? selectedSize : "N/A";

    if (orderedColors.length > 0 || orderedSizes.length > 0) {
      const variant = availableVariants.find((v) => {
        const vColor = getOptionValue(v.attributes, "Color");
        const vSize = getOptionValue(v.attributes, "Size");

        const colorMatch =
          orderedColors.length === 0 || vColor === selectedColor;
        const sizeMatch = orderedSizes.length === 0 || vSize === selectedSize;

        return colorMatch && sizeMatch;
      });
      selectedVariantId = variant?.id;

      if (variant) {
        finalColor = getOptionValue(variant.attributes, "Color") || finalColor;
        finalSize = getOptionValue(variant.attributes, "Size") || finalSize;
      }
    } else if (availableVariants.length > 0) {
      const variant = availableVariants[0];
      selectedVariantId = variant.id;
      finalColor = getOptionValue(variant.attributes, "Color") || "N/A";
      finalSize = getOptionValue(variant.attributes, "Size") || "N/A";
    }

    if (!selectedVariantId) {
      return;
    }

    onAddToCart(product.slug, selectedVariantId, finalSize, finalColor);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-[480px] bg-background z-50 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] mx-4 p-0 border-0 rounded-none gap-0"
        showCloseButton={false}
      >
        <div className="border-b border-border px-6 py-4 flex items-start justify-between">
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

          {orderedColors.length > 1 && (
            <div className="mb-6">
              <label className="block text-[14px] tracking-[-0.48px] mb-3">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {orderedColors.map((color) => {
                  const sampleVariant = availableVariants.find(
                    (v) => getOptionValue(v.attributes, "Color") === color
                  );
                  const apiHex = getAttributeHex(
                    sampleVariant?.attributes,
                    "Color"
                  );
                  const hex = apiHex || COLOR_MAP[color] || "#808080";
                  const isSelected = color === selectedColor;

                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "size-10 rounded-full border transition-all p-0.5 relative ring-offset-background",
                        isSelected
                          ? "border-primary ring-2 ring-primary ring-offset-2"
                          : "border-transparent hover:border-border",
                        "dark:ring-offset-background"
                      )}
                      title={color}
                    >
                      <div
                        className="w-full h-full rounded-full border border-black/10 dark:border-white/20 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {availableSizesForColor.length > 0 &&
            availableSizesForColor[0] !== "N/A" &&
            !(
              availableSizesForColor.length === 1 &&
              availableSizesForColor[0] === "One size"
            ) && (
              <div className="mb-6">
                <label className="block text-[14px] tracking-[-0.48px] mb-3">
                  Size
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {availableSizesForColor.map((size) => {
                    const isAvailable = availableSizesForColor.includes(size);

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        disabled={!isAvailable}
                        className={cn(
                          "h-12 border transition-colors tracking-[-0.48px] text-[14px]",
                          size === selectedSize
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-foreground hover:border-foreground",
                          !isAvailable &&
                            "opacity-50 cursor-not-allowed line-through"
                        )}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
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
