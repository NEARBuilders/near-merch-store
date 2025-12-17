import { FavoriteButton } from "@/components/favorite-button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type Product, useSuspenseProduct } from "@/integrations/marketplace-api";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import React, { useCallback } from "react";

interface ProductCardProps {
  product?: Product;
  productId?: string;
  variant?: 'sm' | 'md' | 'lg' | 'horizontal';
  className?: string;
  onQuickAdd?: (product: Product) => void;
  hideActions?: boolean;
  hideFavorite?: boolean;
  hidePrice?: boolean;
  actionSlot?: React.ReactNode;
  children?: React.ReactNode;
}

export function ProductCard({
  product,
  productId,
  variant = 'md',
  className,
  onQuickAdd,
  hideActions = false,
  hideFavorite = false,
  hidePrice = false,
  actionSlot,
  children
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
  children
}: { productId: string } & Omit<ProductCardProps, 'product' | 'productId'>) {
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
    >
      {children}
    </ProductCardContent>
  );
}

interface ProductCardContentProps extends Omit<ProductCardProps, 'product' | 'productId'> {
  product: Product;
}

function ProductCardContent(props: ProductCardContentProps) {
  const { variant = 'md' } = props;

  if (variant === 'horizontal') {
    return <HorizontalProductLayout {...props} />;
  }

  return <VerticalProductLayout {...props} />;
}

// --- Layout Components ---

function VerticalProductLayout({
  product,
  variant = 'md',
  className,
  onQuickAdd,
  hideActions,
  hideFavorite,
  hidePrice,
  actionSlot,
  children
}: ProductCardContentProps) {
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const handleToggleFavorite = useCallback(
    () => toggleFavorite(product.id, product.title),
    [product, toggleFavorite]
  );

  const handleQuickAddClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onQuickAdd ? onQuickAdd(product) : addToCart(product.id);
    },
    [product, onQuickAdd, addToCart]
  );

  const isFavorite = favoriteIds.includes(product.id);
  const displayImage = product.thumbnailImage || product.images?.[0]?.url || product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url;

  // Text Sizes
  const titleSize = variant === "sm" ? "text-sm" : variant === "lg" ? "text-xl" : "text-lg";
  const priceSize = variant === "sm" ? "text-xs" : variant === "lg" ? "text-lg" : "text-base";

  return (
    <div className={cn(
      "group relative bg-white border border-border overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col h-full",
      className
    )}>
      {/* Image Section */}
      <div className="relative bg-[#F0F0F0] overflow-hidden shrink-0 aspect-square w-full">
        <Link to="/products/$productId" params={{ productId: product.id }} className="block w-full h-full">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
              No Image
            </div>
          )}
        </Link>

        {/* Favorite Button Overlay */}
        {!hideFavorite && (
          <div className="absolute top-3 right-3 z-10">
            <FavoriteButton
              isFavorite={isFavorite}
              onToggle={handleToggleFavorite}
              variant="icon"
              className="bg-white/80 backdrop-blur-sm hover:bg-white shadow-sm"
            />
          </div>
        )}

        {/* Quick Add Overlay */}
        {!hideActions && (
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex justify-center z-10">
            <button
              onClick={handleQuickAddClick}
              className="bg-primary text-primary-foreground px-6 py-2 flex items-center gap-2 hover:bg-primary/90 transition-colors"
            >
              <Plus className="size-4" aria-hidden="true" />
              QUICK ADD
            </button>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4 flex-1 space-y-3 flex flex-col">
        <div className="space-y-1">
          <Link to="/products/$productId" params={{ productId: product.id }} className="block">
            <h3 className={cn("font-medium text-foreground truncate leading-tight transition-colors hover:text-primary", titleSize)}>
              {product.title}
            </h3>
          </Link>
          <p className="text-muted-foreground text-xs uppercase tracking-wider">
            {product.category}
          </p>
        </div>

        {/* Action Slot */}
        {actionSlot}

        {/* Custom Body Children */}
        {children}

        {/* Footer (Price) */}
        {!hidePrice && (
          <div className="mt-auto pt-4 flex items-end justify-between">
            <div className={cn("font-medium text-foreground", priceSize)}>
              ${product.price ? product.price.toFixed(2) : "0.00"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HorizontalProductLayout({
  product,
  className,
  hidePrice,
  actionSlot,
  children
}: ProductCardContentProps) {
  // Horizontal logic is simpler, might not need quick add overly or favorite overlay if used in Cart/Checkout usually

  const displayImage = product.thumbnailImage || product.images?.[0]?.url || product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url;

  return (
    <div className={cn(
      "group relative bg-white border-transparent overflow-hidden flex items-start gap-4 p-4",
      className
    )}>
      {/* Image Section */}
      <div className="relative bg-[#F0F0F0] overflow-hidden shrink-0 size-20 rounded-md">
        <Link to="/products/$productId" params={{ productId: product.id }} className="block w-full h-full">
          {displayImage ? (
            <img
              src={displayImage}
              alt={product.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
              No Image
            </div>
          )}
        </Link>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 justify-between h-full py-0.5 flex flex-col">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <Link to="/products/$productId" params={{ productId: product.id }} className="block">
              <h3 className="font-medium text-foreground truncate leading-tight transition-colors hover:text-primary text-base">
                {product.title}
              </h3>
            </Link>
            <p className="text-muted-foreground text-xs uppercase tracking-wider mt-1">
              {product.category}
            </p>
          </div>

          {/* Action Slot */}
          {actionSlot}
        </div>

        {/* Custom Body Children */}
        {children}

        {/* Footer (Price) */}
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
