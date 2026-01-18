import { LoadingSpinner } from "@/components/loading";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ImageViewer } from "@/components/marketplace/image-viewer";
import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { useNearPrice } from "@/hooks/use-near-price";
import { useCartSidebarStore } from "@/stores/cart-sidebar-store";
import {
  requiresSize,
  useProducts,
  type ProductImage,
} from "@/integrations/api";
import {
  COLOR_MAP,
  getAttributeHex,
  getOptionValue,
} from "@/lib/product-utils";
import { cn } from "@/lib/utils";
import { apiClient } from "@/utils/orpc";
import { createFileRoute, Link, useRouter, useCanGoBack } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";

export const Route = createFileRoute("/_marketplace/products/$productId")({
  pendingComponent: LoadingSpinner,
  loader: async ({ params }) => {
    try {
      const data = await apiClient.getProduct({ id: params.productId });
      return { data: { product: data.product } };
    } catch (error) {
      return { error: error as Error, data: null };
    }
  },
  head: ({ loaderData }) => {
    const product = loaderData?.data?.product;
    const title = product?.title
      ? `${product.title} | Near Merch`
      : "Near Merch";
    const description =
      product?.description || "NEAR-powered merch store for the NEAR ecosystem";
    const image = product?.images?.[0]?.url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
    };
  },
  errorComponent: ({ error }) => {
    const router = useRouter();

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Unable to Load Product</h2>
          </div>
          <p className="text-muted-foreground">
            {error.message ||
              "Failed to load product details. Please check your connection and try again."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.invalidate()}>Try Again</Button>
            <Button
              variant="outline"
              onClick={() => router.navigate({ to: "/" })}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const { nearPrice, isLoading: isLoadingNearPrice } = useNearPrice();
  const openCartSidebar = useCartSidebarStore((state) => state.open);

  const loaderData = Route.useLoaderData();

  if (loaderData.error || !loaderData.data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Unable to Load Product</h2>
          </div>
          <p className="text-muted-foreground">
            {loaderData.error?.message ||
              "Failed to load product details. Please check your connection and try again."}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Link to="/">
              <Button variant="outline">Go Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { product } = loaderData.data;

  const availableVariants = product.variants || [];
  const hasVariants = availableVariants.length > 0;

  const sizeOption = product.options?.find((opt) => opt.name === "Size");
  const colorOption = product.options?.find((opt) => opt.name === "Color");

  const orderedSizes = sizeOption?.values || [];
  const orderedColors = colorOption?.values || [];

  const defaultColor = orderedColors[0] || "";
  const defaultSize = orderedSizes.includes("M") ? "M" : orderedSizes[0] || "";

  const [selectedColor, setSelectedColor] = useState<string>(defaultColor);
  const [selectedSize, setSelectedSize] = useState<string>(defaultSize);

  const selectedVariant = availableVariants.find((v) => {
    const vSize = getOptionValue(v.attributes, "Size");
    const vColor = getOptionValue(v.attributes, "Color");
    return vSize === selectedSize && vColor === selectedColor;
  });

  const displayPrice = selectedVariant?.price || product.price;
  const selectedVariantId = selectedVariant?.id;

  const availableSizesForColor = orderedSizes.filter((size) => {
    return availableVariants.some((v) => {
      const vSize = getOptionValue(v.attributes, "Size");
      const vColor = getOptionValue(v.attributes, "Color");
      return vSize === size && vColor === selectedColor && v.availableForSale;
    });
  });

  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isManualImageSelection, setIsManualImageSelection] = useState(false);
  
  // Track previous color/size to detect actual changes (not initial mount)
  const prevColorSizeRef = useRef<{ color: string; size: string } | null>(null);
  const isInitialMountRef = useRef(true);

  const { data: relatedData } = useProducts({
    category: product.category,
    limit: 4,
  });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  // Determine display images (filter out 'detail' type/blueprints and 'mockup' type)
  // Keep a STABLE order - don't reorder when variant changes
  // Use only variant images (images with variantIds)
  const validImages = useMemo(
    () => product.images.filter(
      (img: ProductImage) => 
        img.type !== "detail" && 
        img.type !== "mockup" &&
        img.variantIds && 
        img.variantIds.length > 0
    ),
    [product.images]
  );

  // Get stable image URLs array - maintain original order
  const productImages = useMemo(
    () => validImages.map((img: ProductImage) => img.url),
    [validImages]
  );

  // Find variant-specific image for the selected variant
  const variantImage = useMemo(
    () =>
      validImages.find((img: ProductImage) =>
        img.variantIds?.includes(selectedVariantId || "")
      ),
    [validImages, selectedVariantId]
  );

  // Reset image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
    setIsManualImageSelection(false);
    isInitialMountRef.current = true;
    prevColorSizeRef.current = null;
  }, [product.id]);

  // When color/variant changes via color picker (not thumbnail click), update main image
  useEffect(() => {
    // Skip on initial mount - always start with first image
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevColorSizeRef.current = { color: selectedColor, size: selectedSize };
      return;
    }

    // Only auto-update if:
    // 1. User didn't manually select an image via thumbnail
    // 2. Color or size actually changed (not just a re-render)
    const colorSizeChanged = 
      prevColorSizeRef.current === null ||
      prevColorSizeRef.current.color !== selectedColor ||
      prevColorSizeRef.current.size !== selectedSize;

    if (!isManualImageSelection && variantImage && colorSizeChanged) {
      const variantImageIndex = validImages.findIndex(
        (img) => img.id === variantImage.id
      );
      if (variantImageIndex !== -1 && variantImageIndex !== currentImageIndex) {
        setCurrentImageIndex(variantImageIndex);
      }
    }

    // Update ref for next comparison
    prevColorSizeRef.current = { color: selectedColor, size: selectedSize };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, selectedSize, variantImage, isManualImageSelection]);

  // Reset manual selection flag after color/size changes settle
  useEffect(() => {
    if (isManualImageSelection) {
      const timer = setTimeout(() => setIsManualImageSelection(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isManualImageSelection]);

  // Favorites should track the MAIN product
  const isFavorite = favoriteIds.includes(product.id);

  const needsSize =
    requiresSize(product.category) && hasVariants && orderedSizes.length > 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product.slug, selectedVariantId || '', selectedSize, selectedColor);
    }
    openCartSidebar();
  };

  const handleImageClick = (index: number) => {
    setViewerImageIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="bg-background w-full min-h-screen pt-32">
      {viewerOpen && (
        <ImageViewer
          images={productImages}
          initialIndex={viewerImageIndex}
          onClose={() => setViewerOpen(false)}
          productName={product.title}
        />
      )}

      <div className="container-app mx-auto px-4 md:px-8 lg:px-16 mb-8">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Block */}
          <button
            onClick={() => {
              if (canGoBack) {
                router.history.back();
              } else {
                router.navigate({ to: "/" });
              }
            }}
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </button>

          {/* Title Block */}
          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8">
            <div className="flex items-center justify-end gap-3">
              {product.category === 'Exclusives' && (
                <div className="h-[40px] flex items-center justify-center bg-muted/30 px-3 py-2 text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground border border-border/40 w-fit dark:bg-[#00EC97]/10 dark:text-[#00EC97] dark:border-[#00EC97]/60 rounded-lg">
                  EXCLUSIVE
                </div>
              )}
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={() => toggleFavorite(product.id, product.title)}
                variant="button"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container-app mx-auto px-4 md:px-8 lg:px-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Title Block - Mobile: above image, Desktop: in right column */}
          <div className="lg:hidden">
            <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-6 py-4 md:py-5 mb-6">
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90 dark:text-muted-foreground">
                  {product.title}
                </h1>
              </div>
            </div>
          </div>

          {/* Image Block */}
          <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-4 md:p-6">
          <div className="w-full space-y-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/40 to-background/90 dark:from-background/10 dark:via-background/60 dark:to-background z-0"></div>
              {productImages.map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-500 cursor-pointer z-10",
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  )}
                  onClick={() => handleImageClick(currentImageIndex)}
                >
                  <img
                    src={img}
                    alt={`${product.title} - Image ${index + 1}`}
                    className="w-full h-full object-cover relative z-10"
                  />
                </div>
              ))}

              {productImages.length > 1 && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsManualImageSelection(true);
                      setCurrentImageIndex(
                        (prev) =>
                          (prev - 1 + productImages.length) %
                          productImages.length
                      );
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-border/60 bg-background/60 backdrop-blur-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-all duration-200 text-foreground/80"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsManualImageSelection(true);
                      setCurrentImageIndex(
                        (prev) => (prev + 1) % productImages.length
                      );
                    }}
                    className="flex items-center justify-center w-10 h-10 rounded-lg border border-border/60 bg-background/60 backdrop-blur-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-all duration-200 text-foreground/80"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground/90 dark:text-muted-foreground text-sm z-10">
                  {currentImageIndex + 1} / {productImages.length}
                </div>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {productImages.map((img, index) => {
                  // Use stable validImages array, not sortedImages
                  const imageObj = validImages[index];
                  
                  return (
                    <button
                      key={`${imageObj?.id || index}-${img}`}
                      onClick={() => {
                        setIsManualImageSelection(true);
                        setCurrentImageIndex(index);
                        
                        // Update color if this image is associated with a variant
                        // Proper matching: Image → Variant(s) → Color (considering current Size)
                        if (imageObj?.variantIds?.length) {
                          // Find variants that match this image
                          const matchingVariants = availableVariants.filter(
                            (v) => imageObj.variantIds?.includes(v.id)
                          );
                          
                          if (matchingVariants.length > 0) {
                            // Prefer variant that matches current size, otherwise use first match
                            const preferredVariant = matchingVariants.find((v) => {
                              const vSize = getOptionValue(v.attributes, "Size");
                              return vSize === selectedSize;
                            }) || matchingVariants[0];
                            
                            const variantColor = getOptionValue(preferredVariant.attributes, "Color");
                            if (variantColor && orderedColors.includes(variantColor)) {
                              setSelectedColor(variantColor);
                            }
                          }
                        }
                      }}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                        index === currentImageIndex
                            ? "border-[#00EC97]"
                            : "border-border/60 hover:border-[#00EC97]/60 opacity-60 hover:opacity-100"
                      )}
                    >
                      <img
                        src={img}
                        alt={`${product.title} - Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Title Block - Desktop only */}
            <div className="hidden lg:block rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-6 py-4 md:py-5">
              <div className="space-y-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground/90 dark:text-muted-foreground">
                  {product.title}
                </h1>
              </div>
            </div>

            {/* Product Info Block */}
            <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8 space-y-8">
            {/* Price */}
            <div className="flex items-baseline gap-4 flex-wrap">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl md:text-4xl font-bold text-foreground dark:text-foreground">
                  ${displayPrice}
                </span>
                <span className="text-sm text-foreground/80 dark:text-muted-foreground/60 font-normal">
                  USD
                </span>
              </div>
              {nearPrice && (
                <>
                  <span className="text-foreground/60 dark:text-muted-foreground/30">•</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl md:text-4xl font-bold text-[#00EC97]">
                      {isLoadingNearPrice ? '...' : (displayPrice / nearPrice).toFixed(2)}
                    </span>
                    <span className="text-sm text-[#00EC97]/80 font-normal">
                      NEAR
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <p className="text-base md:text-lg text-foreground/90 dark:text-muted-foreground leading-relaxed">
                {product.description}
              </p>
              </div>
            )}

            {/* Separator */}
            <div className="h-px bg-border/60" />

            {/* Options Section */}
            <div className="space-y-6">
              {/* Color Selection */}
            {orderedColors.length > 0 && (
              <div className="space-y-3">
                  <label className="block text-sm font-semibold tracking-[-0.48px] text-foreground/90 dark:text-muted-foreground uppercase">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-3">
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
                        onClick={() => {
                          setIsManualImageSelection(false);
                          setSelectedColor(color);
                        }}
                        className={cn(
                            "size-10 rounded-lg border-2 transition-colors overflow-hidden",
                          isSelected
                              ? "border-[#00EC97]"
                              : "border-border/60 hover:border-[#00EC97]/60"
                        )}
                        title={color}
                          style={{ backgroundColor: hex }}
                        />
                    );
                  })}
                </div>
              </div>
            )}

              {/* Size Selection */}
            {hasVariants && orderedSizes.length > 0 && !(orderedSizes.length === 1 && orderedSizes[0] === "One size") && (
              <div className="space-y-3 min-h-[80px]">
                  <label className="block text-sm font-semibold tracking-[-0.48px] text-foreground/90 dark:text-muted-foreground uppercase">
                    Size
                  </label>
                <div className="flex flex-wrap gap-2">
                  {orderedSizes.map((size) => {
                    const isAvailable = availableSizesForColor.includes(size);

                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={!isAvailable}
                        className={cn(
                            "px-5 py-2.5 tracking-[-0.48px] transition-all rounded-lg font-medium text-sm border-2",
                          size === selectedSize
                              ? "bg-[#00EC97] text-black border-[#00EC97]"
                              : "bg-background/40 border-border/60 hover:border-[#00EC97] hover:text-[#00EC97] hover:bg-background/60",
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

              {/* Quantity Selection */}
            <div className="space-y-3">
                <label className="block text-sm font-semibold tracking-[-0.48px] text-foreground/90 dark:text-muted-foreground uppercase">
                  Quantity
                </label>
                <div className="flex items-center gap-3 border border-border/60 rounded-lg w-fit px-2 py-1.5 bg-background/40">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-background/60 hover:text-[#00EC97] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 1}
                    aria-label="Decrease quantity"
                >
                  <Minus className="size-4" />
                </button>
                  <span className="tracking-tight min-w-[3ch] text-center text-base font-semibold text-foreground dark:text-foreground">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-background/60 hover:text-[#00EC97] rounded-lg transition-colors"
                    aria-label="Increase quantity"
                >
                  <Plus className="size-4" />
                </button>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <div className="pt-2">
            <Button
              onClick={handleAddToCart}
                className="w-full bg-[#00EC97] text-black hover:bg-[#00d97f] rounded-lg h-14 text-base font-bold transition-colors"
              disabled={needsSize && !selectedVariant}
            >
              Add to Cart - ${(displayPrice * quantity).toFixed(2)}
            </Button>
            </div>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-16 space-y-6">
            {/* Title Block */}
            <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
              <div className="flex flex-row items-center justify-between gap-4">
                <div className="space-y-2 flex-1 min-w-0">
                  <h2 className="text-xl md:text-2xl font-medium tracking-tight text-foreground/90 dark:text-muted-foreground">
                You Might Also Like
              </h2>
                </div>
                <Link to="/products" className="shrink-0">
                  <Button className="bg-[#00EC97] text-black hover:bg-[#00d97f] rounded-lg h-14 text-base font-bold whitespace-nowrap">
                    All Products
                  </Button>
                </Link>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  variant="sm"
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
