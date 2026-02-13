import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { useFavorites } from "@/hooks/use-favorites";
import { useCart } from "@/hooks/use-cart";
import { type Product, useSuspenseProduct, requiresSize } from "@/integrations/api";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import React, { useCallback, useState, useEffect } from "react";
import { useCartSidebarStore } from "@/stores/cart-sidebar-store";
import {
  COLOR_MAP,
  getAttributeHex,
  getOptionValue,
  getVariantImageUrl,
} from "@/lib/product-utils";

interface ProductCardProps {
  product?: Product;
  productId?: string;
  variant?: "sm" | "md" | "lg" | "horizontal";
  className?: string;
  onQuickAdd?: (product: Product) => void;
  hideActions?: boolean;
  hideFavorite?: boolean;
  hidePrice?: boolean;
  actionSlot?: React.ReactNode;
  children?: React.ReactNode;
  imageOverride?: string;
}

export function ProductCard({
  product,
  productId,
  variant = "md",
  className,
  onQuickAdd,
  hideActions = false,
  hideFavorite = false,
  hidePrice = false,
  actionSlot,
  children,
  imageOverride,
}: ProductCardProps) {
  if (product) {
    return (
      <ProductCardContent
        product={product}
        variant={variant}
        className={className}
        onQuickAdd={onQuickAdd}
        hideActions={hideActions}
        hideFavorite={hideFavorite}
        hidePrice={hidePrice}
        actionSlot={actionSlot}
        imageOverride={imageOverride}
      >
        {children}
      </ProductCardContent>
    );
  }

  if (productId) {
    return (
      <SuspendedProductCard
        productId={productId}
        variant={variant}
        className={className}
        onQuickAdd={onQuickAdd}
        hideActions={hideActions}
        hideFavorite={hideFavorite}
        hidePrice={hidePrice}
        actionSlot={actionSlot}
      >
        {children}
      </SuspendedProductCard>
    );
  }

  return null;
}

function SuspendedProductCard({
  productId,
  variant,
  className,
  onQuickAdd,
  hideActions,
  hideFavorite,
  hidePrice,
  actionSlot,
  children,
  imageOverride,
}: { productId: string } & Omit<ProductCardProps, "product" | "productId">) {
  const { data } = useSuspenseProduct(productId);
  return (
    <ProductCardContent
      product={data.product}
      variant={variant}
      className={className}
      onQuickAdd={onQuickAdd}
      hideActions={hideActions}
      hideFavorite={hideFavorite}
      hidePrice={hidePrice}
      actionSlot={actionSlot}
      imageOverride={imageOverride}
    >
      {children}
    </ProductCardContent>
  );
}

interface ProductCardContentProps
  extends Omit<ProductCardProps, "product" | "productId"> {
  product: Product;
  imageOverride?: string;
}

function ProductCardContent(props: ProductCardContentProps) {
  const { variant = "md" } = props;

  if (variant === "horizontal") {
    return <HorizontalProductLayout {...props} />;
  }

  return <VerticalProductLayout {...props} />;
}

function VerticalProductLayout({
  product,
  variant = "md",
  className,
  onQuickAdd,
  hideActions,
  hideFavorite,
  hidePrice,
  actionSlot,
  children,
  imageOverride: _imageOverride,
}: ProductCardContentProps) {
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { addToCart } = useCart();
  const openCartSidebar = useCartSidebarStore((state) => state.open);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const colorOption = product?.options?.find((opt) => opt.name === "Color");
  const sizeOption = product?.options?.find((opt) => opt.name === "Size");
  const orderedColors = colorOption?.values || [];
  const orderedSizes = sizeOption?.values || [];
  const needsSize = product ? requiresSize(product.collections) : false;
  const availableSizes = orderedSizes.length > 0 ? orderedSizes : ["N/A"];
  const availableVariants = product?.variants || [];

  useEffect(() => {
    if (isExpanded && product) {
      setSelectedColor(orderedColors[0] || "");
      setSelectedSize(orderedSizes.includes("M") ? "M" : orderedSizes[0] || "");
    }
  }, [isExpanded, product, orderedColors, orderedSizes]);

  const availableSizesForColor = availableSizes.filter((size) => {
    if (size === "N/A") return true;
    return availableVariants.some((v) => {
      const vSize = getOptionValue(v.attributes, "Size");
      const vColor = getOptionValue(v.attributes, "Color");
      return vSize === size && vColor === selectedColor && v.availableForSale;
    });
  });

  const handleToggleFavorite = useCallback(
    () => toggleFavorite(product.id, product.title),
    [product, toggleFavorite]
  );

  const handleQuickAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (orderedColors.length > 0 || orderedSizes.length > 0) {
        setIsExpanded(!isExpanded);
      } else if (onQuickAdd) {
        onQuickAdd(product);
      }
    },
    [product, onQuickAdd, isExpanded, orderedColors.length, orderedSizes.length]
  );

  const handleAddToCart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      let selectedVariantId: string | undefined;
      let finalColor = selectedColor || "N/A";
      let finalSize = needsSize ? selectedSize : "N/A";

      if (orderedColors.length > 0 || orderedSizes.length > 0) {
        const variant = availableVariants.find((v) => {
          const vColor = getOptionValue(v.attributes, "Color");
          const vSize = getOptionValue(v.attributes, "Size");
          const colorMatch = orderedColors.length === 0 || vColor === selectedColor;
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

      if (!selectedVariantId && availableVariants.length > 0) {
        selectedVariantId = availableVariants[0].id;
      }

      if (selectedVariantId) {
        const variantImageUrl = getVariantImageUrl(product, selectedVariantId);
        addToCart(product.slug, selectedVariantId, finalSize, finalColor, variantImageUrl);
        setIsExpanded(false);
        openCartSidebar();
      }
    },
    [product, addToCart, selectedColor, selectedSize, orderedColors, orderedSizes, availableVariants, needsSize, openCartSidebar]
  );

  const isFavorite = favoriteIds.includes(product.id);
  
  // Filter out mockup images and use only variant images
  const variantImages = product.images?.filter(
    (img) => img.type !== "mockup" && img.type !== "detail" && img.variantIds && img.variantIds.length > 0
  ) || [];
  
  const displayImage =
    variantImages[0]?.url ||
    product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url ||
    product.images?.find((img) => img.type !== "mockup" && img.type !== "detail")?.url;

  const titleSize =
    variant === "sm" ? "text-sm" : variant === "lg" ? "text-xl" : "text-lg";
  const priceSize = "text-sm";

  return (
    <div
      className={cn(
        "group relative rounded-2xl bg-background/5 backdrop-blur-sm border border-border/60 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-border flex flex-col h-full",
        className
      )}
      data-testid="product-card"
    >
      <div className="relative bg-muted overflow-hidden shrink-0 aspect-square w-full rounded-t-2xl">
        <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/20 to-background/60 dark:from-background/5 dark:via-background/30 dark:to-background/80 z-0"></div>
        <Link
          to="/products/$productId"
          params={{ productId: product.slug }}
          preload="intent"
          preloadDelay={0}
          className="block w-full h-full relative z-10"
          resetScroll={true}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              loading="lazy"
              decoding="async"
              width={400}
              height={400}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/90 dark:text-muted-foreground bg-muted relative z-10">
              No Image
            </div>
          )}
        </Link>

        {/* Gradient overlay for text readability - only at bottom to help title stand out */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background via-background/60 to-transparent z-[15] pointer-events-none"></div>

        {/* Price badge - top left corner */}
        {!hidePrice && (
          <div className="absolute top-3 left-3 p-2 bg-background/60 backdrop-blur-sm border border-border/60 rounded-lg z-20 flex items-center">
            <div className={cn("font-medium text-[#00EC97]", priceSize)}>
              ${product.price ? product.price.toFixed(2) : "0.00"}
            </div>
          </div>
        )}

        {/* Product info overlay on image - moved lower */}
        <div className="absolute bottom-0 left-0 right-0 pb-1 px-4 z-20 pointer-events-none">
          <Link
            to="/products/$productId"
            params={{ productId: product.slug }}
            className="block pointer-events-auto"
            resetScroll={true}
          >
            <div className="space-y-1">
              <h3
                className={cn(
                  "font-medium text-foreground truncate leading-tight transition-colors hover:text-[#00EC97] drop-shadow-lg",
                  titleSize
                )}
              >
                {product.title}
              </h3>
              {product.collections && product.collections.length > 0 && (
                <p className="text-foreground/90 dark:text-muted-foreground text-xs uppercase tracking-wider drop-shadow-lg">
                  {product.collections[0]?.name}
                </p>
              )}
            </div>
          </Link>
        </div>

        {!hideFavorite && (
          <FavoriteButton
            isFavorite={isFavorite}
            onToggle={handleToggleFavorite}
            variant="icon"
          />
        )}

        {!hideActions && !isExpanded && (
          <button
            type="button"
            onClick={handleQuickAddClick}
            className="absolute bottom-3 right-3 p-2 bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-background/80 hover:text-[#00EC97] transition-all z-30 rounded-lg group flex items-center gap-0 overflow-hidden"
            data-testid="quick-add-button"
            aria-label="Add to cart"
          >
            <ShoppingCart className="size-4 transition-all duration-200 flex-shrink-0 stroke-foreground group-hover:stroke-[#00EC97]" aria-hidden="true" />
            <span className="text-sm font-semibold whitespace-nowrap w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 group-hover:ml-2 transition-all duration-200">
              +ADD
            </span>
          </button>
        )}

        {/* Expanded Quick Add Section - appears at bottom of image */}
        {isExpanded && !hideActions && (
          <div className="absolute bottom-3 left-3 right-3 z-30 rounded-2xl bg-background/95 backdrop-blur-sm border border-border/60 p-4 space-y-4 max-h-[60%] overflow-y-auto shadow-xl">
            {orderedColors.length > 0 && (
              <div>
                <label className="block text-xs font-medium mb-2 text-foreground/90 dark:text-foreground/90 dark:text-muted-foreground">
                  Color: {selectedColor}
                </label>
                <div className="flex flex-wrap gap-2">
                  {orderedColors.map((color) => {
                    const sampleVariant = availableVariants.find(
                      (v) => getOptionValue(v.attributes, "Color") === color
                    );
                    const apiHex = getAttributeHex(sampleVariant?.attributes, "Color");
                    const hex = apiHex || COLOR_MAP[color] || "#808080";
                    const isSelected = color === selectedColor;

                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedColor(color);
                        }}
                        className={cn(
                          "size-8 rounded-lg border transition-all p-0.5",
                          isSelected
                            ? "border-[#00EC97] ring-2 ring-[#00EC97]/30 ring-offset-1"
                            : "border-border/60 hover:border-[#00EC97]/60"
                        )}
                        title={color}
                      >
                        <div
                          className="w-full h-full rounded-md border border-black/10 dark:border-white/20"
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
              !(availableSizesForColor.length === 1 && availableSizesForColor[0] === "One size") && (
                <div>
                  <label className="block text-xs font-medium mb-2 text-foreground/90 dark:text-foreground/90 dark:text-muted-foreground">
                    Size
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {availableSizesForColor.map((size) => {
                      const isAvailable = availableSizesForColor.includes(size);
                      const isSelected = size === selectedSize;

                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isAvailable) setSelectedSize(size);
                          }}
                          disabled={!isAvailable}
                          className={cn(
                            "h-8 border border-border/60 rounded-lg transition-all text-xs font-medium",
                            isSelected
                              ? "border-[#00EC97] bg-[#00EC97] text-black"
                              : "bg-background/40 text-foreground hover:bg-background/60 hover:border-[#00EC97]",
                            !isAvailable && "opacity-50 cursor-not-allowed line-through"
                          )}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsExpanded(false);
                }}
                className="flex-1 border border-border/60 bg-background/40 text-foreground h-9 flex items-center justify-center rounded-lg text-sm font-medium hover:bg-background/60 hover:border-[#00EC97] hover:text-[#00EC97] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="flex-1 bg-[#00EC97] text-black h-9 flex items-center justify-center rounded-lg text-sm font-medium hover:bg-[#00d97f] transition-colors"
              >
                Add to Cart
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 pt-0 flex-1 space-y-3 flex flex-col">
        {actionSlot}

        {children}
      </div>
    </div>
  );
}

function HorizontalProductLayout({
  product,
  className,
  hidePrice,
  actionSlot,
  children,
  imageOverride,
}: ProductCardContentProps) {
  // Use imageOverride if provided, otherwise use default logic
  const variantImages = product.images?.filter(
    (img) => img.type !== "mockup" && img.type !== "detail" && img.variantIds && img.variantIds.length > 0
  ) || [];
  
  const displayImage = imageOverride ||
    variantImages[0]?.url ||
    product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url ||
    product.images?.find((img) => img.type !== "mockup" && img.type !== "detail")?.url;

  return (
    <div
      className={cn(
        "group relative bg-transparent border-transparent overflow-hidden flex items-start gap-4 p-4",
        className
      )}
      data-testid="cart-item"
    >
      <div className="relative bg-muted overflow-hidden shrink-0 size-20 rounded-md">
        <div className="absolute inset-0 bg-gradient-to-b from-background/5 via-background/20 to-background/60 dark:from-background/5 dark:via-background/30 dark:to-background/80 z-0"></div>
        <Link
          to="/products/$productId"
          params={{ productId: product.slug }}
          preload="intent"
          preloadDelay={0}
          className="block w-full h-full relative z-10"
          resetScroll={true}
        >
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              loading="lazy"
              decoding="async"
              width={80}
              height={80}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 relative z-10"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-foreground/90 dark:text-muted-foreground bg-muted relative z-10">
              No Image
            </div>
          )}
        </Link>
      </div>

      <div className="flex-1 min-w-0 justify-between h-full py-0.5 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <Link
              to="/products/$productId"
              params={{ productId: product.slug }}
              className="block"
              resetScroll={true}
            >
              <h3 className="font-medium text-foreground leading-tight transition-colors hover:text-primary text-base">
                {product.title}
              </h3>
            </Link>
            {product.collections && product.collections.length > 0 && (
              <p className="text-foreground/90 dark:text-muted-foreground text-xs uppercase tracking-wider mt-1">
                {product.collections[0]?.name}
              </p>
            )}
          </div>

          {actionSlot}
        </div>

        {children}

        {!hidePrice && (
          <div className="mt-2 flex items-end justify-between">
            <div className="font-medium text-foreground text-sm">
              ${product.price ? product.price.toFixed(2) : "0.00"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
