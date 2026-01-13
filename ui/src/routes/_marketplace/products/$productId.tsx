import { LoadingSpinner } from "@/components/loading";
import { FavoriteButton } from "@/components/marketplace/favorite-button";
import { ImageViewer } from "@/components/marketplace/image-viewer";
import { ProductCard } from "@/components/marketplace/product-card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
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
import { useState } from "react";

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

  const { data: relatedData } = useProducts({
    category: product.category,
    limit: 4,
  });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  // Determine display images (filter out 'detail' type/blueprints)
  const validImages = product.images.filter(
    (img: ProductImage) => img.type !== "detail"
  );

  // STRICTLY prioritize images over design files.
  const variantImage = validImages.find((img: ProductImage) =>
    img.variantIds?.includes(selectedVariantId || "")
  );

  const sortedImages = variantImage
    ? [
        variantImage,
        ...validImages.filter((img: ProductImage) => img !== variantImage),
      ]
    : validImages;

  const getProductImages = () => {
    if (sortedImages.length > 0) {
      return sortedImages.map((img: ProductImage) => img.url);
    }
    return [];
  };
  const productImages = getProductImages();

  // Favorites should track the MAIN product
  const isFavorite = favoriteIds.includes(product.id);

  const needsSize =
    requiresSize(product.category) && hasVariants && orderedSizes.length > 0;

  const handleAddToCart = () => {
    if (!selectedVariant) return;
    for (let i = 0; i < quantity; i++) {
      addToCart(product.slug, selectedVariantId || '', selectedSize, selectedColor);
    }
  };

  const handleImageClick = (index: number) => {
    setViewerImageIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="bg-background w-full min-h-screen">
      {viewerOpen && (
        <ImageViewer
          images={productImages}
          initialIndex={viewerImageIndex}
          onClose={() => setViewerOpen(false)}
          productName={product.title}
        />
      )}

      <div className="border-b border-border">
        <div className="container-app py-4">
          <button
            onClick={() => {
              if (canGoBack) {
                router.history.back();
              } else {
                router.navigate({ to: "/" });
              }
            }}
            className="flex items-center gap-3 hover:opacity-70 transition-opacity cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-tight">Back to Shop</span>
          </button>
        </div>
      </div>

      <div className="container-app py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full space-y-4">
            <div className="relative w-full aspect-square rounded-lg overflow-hidden shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.15)]">
              {productImages.map((img, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-500 cursor-pointer",
                    index === currentImageIndex ? "opacity-100" : "opacity-0"
                  )}
                  onClick={() => handleImageClick(currentImageIndex)}
                >
                  <img
                    src={img}
                    alt={`${product.title} - Image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}

              {productImages.length > 1 && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(
                        (prev) =>
                          (prev - 1 + productImages.length) %
                          productImages.length
                      );
                    }}
                    className="group flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:border-white transition-all duration-300"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5 text-white group-hover:text-black transition-colors" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(
                        (prev) => (prev + 1) % productImages.length
                      );
                    }}
                    className="group flex items-center justify-center w-10 h-10 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:border-white transition-all duration-300"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5 text-white group-hover:text-black transition-colors" />
                  </button>
                </div>
              )}

              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white text-sm z-10">
                  {currentImageIndex + 1} / {productImages.length}
                </div>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {productImages.map((img, index) => {
                  const imageObj = sortedImages[index];
                  
                  return (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        
                        if (imageObj?.variantIds?.length) {
                          const variant = availableVariants.find(
                            (v) => imageObj.variantIds?.includes(v.id)
                          );
                          if (variant) {
                            const variantColor = getOptionValue(variant.attributes, "Color");
                            if (variantColor && orderedColors.includes(variantColor)) {
                              setSelectedColor(variantColor);
                            }
                          }
                        }
                      }}
                      className={cn(
                        "flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all",
                        index === currentImageIndex
                          ? "border-primary ring-1 ring-primary"
                          : "border-transparent hover:border-border opacity-60 hover:opacity-100"
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

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-block border border-border px-2 py-1">
                <span className="text-xs tracking-[-0.48px]">
                  {product.category}
                </span>
              </div>
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={() => toggleFavorite(product.id, product.title)}
                variant="button"
              />
            </div>

            <h1 className="text-2xl font-medium tracking-[-0.48px]">
              {product.title}
            </h1>

            <span className="text-lg tracking-[-0.48px]">${displayPrice}</span>

            {product.description && (
              <p className="text-muted-foreground tracking-tight leading-6">
                {product.description}
              </p>
            )}

            <div className="h-px bg-border" />

            {orderedColors.length > 0 && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Color</label>
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
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "size-8 rounded-full border transition-all p-0.5 relative ring-offset-background",
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

            {hasVariants && orderedSizes.length > 0 && !(orderedSizes.length === 1 && orderedSizes[0] === "One size") && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Size</label>
                <div className="flex flex-wrap gap-2">
                  {orderedSizes.map((size) => {
                    const isAvailable = availableSizesForColor.includes(size);

                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        disabled={!isAvailable}
                        className={cn(
                          "px-4 py-2 tracking-[-0.48px] transition-colors",
                          size === selectedSize
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border hover:bg-muted",
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

            <div className="space-y-3">
              <label className="block tracking-tight">Quantity</label>
              <div className="flex items-center gap-3 border border-border rounded w-fit px-1 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-muted rounded transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="tracking-tight min-w-[2ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-muted rounded transition-colors"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={needsSize && !selectedVariant}
            >
              Add to Cart - ${(displayPrice * quantity).toFixed(2)}
            </Button>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-24 space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-medium tracking-tight">
                You Might Also Like
              </h2>
              <p className="text-muted-foreground tracking-tight">
                Explore more from our collection
              </p>
            </div>

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
