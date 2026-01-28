import { ProductCard } from "@/components/marketplace/product-card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type Product, requiresSize } from "@/integrations/api";
import {
  COLOR_MAP,
  getAttributeHex,
  getOptionValue,
  getVariantImageUrl,
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
    color: string,
    imageUrl?: string
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

  const needsSize = product ? requiresSize(product.categories) : false;
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

    const variantImageUrl = getVariantImageUrl(product, selectedVariantId);
    onAddToCart(product.slug, selectedVariantId, finalSize, finalColor, variantImageUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-0 !max-w-[calc(100%-2.5rem)] sm:!max-w-md !left-[50%] !translate-x-[-50%]"
      >
        <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Add to Cart</h2>
          <button
            type="button"
            onClick={onClose}
              className="h-8 w-8 flex items-center justify-center hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97] transition-colors"
            aria-label="Close modal"
          >
              <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
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
                        "size-10 rounded-full border transition-all p-0.5 relative",
                        isSelected
                          ? "border-[#00EC97] ring-2 ring-[#00EC97]/30 ring-offset-2"
                          : "border-border/60 hover:border-[#00EC97]/60",
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
                          "h-12 border border-border/60 rounded-lg transition-all tracking-[-0.48px] text-[14px] font-medium",
                          size === selectedSize
                            ? "border-[#00EC97] bg-[#00EC97] text-black shadow-sm"
                            : "bg-background/40 text-foreground hover:bg-background/60 hover:border-border",
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
              className="flex-1 h-10 border border-border/60 bg-background/40 text-foreground tracking-[-0.48px] text-[14px] hover:bg-background/60 transition-colors rounded-lg"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              className="flex-1 h-10 bg-[#00EC97] text-black tracking-[-0.48px] text-[14px] hover:bg-[#00d97f] transition-colors rounded-lg font-medium"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
