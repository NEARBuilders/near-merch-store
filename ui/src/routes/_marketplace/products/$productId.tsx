import { FavoriteButton } from "@/components/favorite-button";
import { LoadingSpinner } from "@/components/loading";
import { ImageViewer } from "@/components/marketplace/image-viewer";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import {
  productLoaders,
  requiresSize,
  useProducts,
  useSuspenseProduct
} from "@/integrations/marketplace-api";
import { cn } from "@/lib/utils";
import { queryClient } from "@/utils/orpc";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, Minus, Plus } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_marketplace/products/$productId")({
  pendingComponent: LoadingSpinner,
  loader: async ({ params }) => {
    await queryClient.ensureQueryData(productLoaders.detail(params.productId));
  },
  errorComponent: ({ error }) => {
    const router = useRouter();

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Unable to Load Product</h2>
          </div>
          <p className="text-gray-600">
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

function getOptionValue(
  attributes: Array<{ name: string; value: string }>,
  optionName: string
): string | undefined {
  return attributes.find(
    (opt) => opt.name.toLowerCase() === optionName.toLowerCase()
  )?.value;
}

const COLOR_MAP: Record<string, string> = {
  "Black": "#000000",
  "White": "#FFFFFF",
  "Navy": "#000080",
  "Dark Grey Heather": "#333333",
  "Sport Grey": "#808080",
  "Blue": "#0000FF",
  "Red": "#FF0000",
  "Green": "#008000",
  // Add common expected colors
};

function getProductColor(title: string): string | undefined {
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (title.toLowerCase().includes(name.toLowerCase())) {
      return hex;
    }
  }
  return undefined;
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const { data } = useSuspenseProduct(productId);
  const mainProduct = data.product;
  const subProducts = mainProduct.subProducts || [mainProduct];

  const [selectedStyleId, setSelectedStyleId] = useState(mainProduct.id);
  const activeProduct = subProducts.find(p => p.id === selectedStyleId) || mainProduct;

  const availableVariants = activeProduct.variants || [];
  const hasVariants = availableVariants.length > 0;

  // Deduplicate sizes
  const uniqueSizes = Array.from(new Set(
    availableVariants.map(v => getOptionValue(v.attributes, "size") || v.title)
  )).filter(Boolean);

  const [selectedSize, setSelectedSize] = useState<string>("");

  // Initialize selected size if available
  if (uniqueSizes.length > 0 && !selectedSize) {
    // Don't call setState during render, do it in effect or lazy init if possible.
    // For now, let's treat empty as "Select size" or pick first.
    // Better pattern: derive 'selectedVariant' from 'selectedSize'
  }

  // Find variant matching selected style and selected size (if strictly needed)
  // OR just find the first available variant if size not selected yet.
  const selectedVariant = availableVariants.find(v => {
    const size = getOptionValue(v.attributes, "size") || v.title;
    return size === selectedSize;
  }) || availableVariants[0];

  const displayPrice = selectedVariant?.price || activeProduct.price;

  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const { data: relatedData } = useProducts({
    category: mainProduct.category,
    limit: 4,
  });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== mainProduct.id && !subProducts.some(sp => sp.id === p.id))
    .slice(0, 3);

  const getProductImages = () => {
    // STRICTLY prioritize images over design files.
    // Filter out potential design placeholders if they are mixed in 'images' array (heuristic: usually design files are in designFiles prop)
    if (activeProduct.images && activeProduct.images.length > 0) {
      return activeProduct.images.map((img) => img.url);
    }
    // Fallback only if NO images exist, though user asked to remove them.
    // If logic is "never show design files", returns empty if no images.
    return [];
  };
  const productImages = getProductImages();
  const isFavorite = favoriteIds.includes(activeProduct.id);
  const needsSize = requiresSize(activeProduct.category) && hasVariants;

  const handleAddToCart = () => {
    // If size required but not selected (and multiple sizes exist), might want to validate.
    // For now assuming default variant logic handles basic add.
    const size = selectedSize || getOptionValue(selectedVariant?.attributes || [], "size") || "N/A";

    // We need the specific variant ID for the selected size
    const targetVariant = availableVariants.find(v => {
      const vSize = getOptionValue(v.attributes, "size") || v.title;
      return vSize === size;
    }) || selectedVariant;

    // Use current activeProduct.id but technically cart might expect variant ID logic?
    // Based on `use-cart.ts`, `addToCart(productId, size)` is standard.
    for (let i = 0; i < quantity; i++) {
      addToCart(activeProduct.id, size);
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
          productName={activeProduct.title}
        />
      )}

      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-[-0.48px]">Back to Shop</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full">
            <div className="flex gap-4">
              {productImages.length > 0 && (
                <div
                  className="rounded-lg cursor-pointer hover:scale-[1.02] transition-all duration-300 w-full aspect-square relative shadow-[0_0_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_-10px_rgba(255,255,255,0.15)]"
                  onClick={() => handleImageClick(0)}
                >
                  {/* Removed 'bg-muted' and borders. Added theme-aware back glow. */}
                  <div className="absolute inset-0 bg-transparent" />
                  <img
                    src={productImages[0]}
                    alt={activeProduct.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-block border border-border px-2 py-1">
                <span className="text-xs tracking-[-0.48px]">
                  {activeProduct.category}
                </span>
              </div>
              <FavoriteButton
                isFavorite={isFavorite}
                onToggle={() => toggleFavorite(activeProduct.id, activeProduct.title)}
                variant="button"
              />
            </div>

            <h1 className="text-2xl font-medium tracking-[-0.48px]">
              {activeProduct.title}
            </h1>

            <span className="text-lg tracking-[-0.48px]">
              ${displayPrice}
            </span>

            {activeProduct.description && (
              <p className="text-[#717182] tracking-[-0.48px] leading-6">
                {activeProduct.description}
              </p>
            )}

            <div className="h-px bg-border" />

            {subProducts.length > 1 && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Style</label>
                <div className="flex flex-wrap gap-2">
                  {subProducts.map((subProduct) => {
                    const color = getProductColor(subProduct.title);
                    const isSelected = selectedStyleId === subProduct.id;

                    if (color) {
                      return (
                        <button
                          key={subProduct.id}
                          onClick={() => setSelectedStyleId(subProduct.id)}
                          className={cn(
                            "size-8 rounded-full border-2 transition-all p-0.5 relative",
                            isSelected ? "border-primary" : "border-transparent hover:border-border"
                          )}
                          title={subProduct.title}
                        >
                          <div
                            className="w-full h-full rounded-full border border-black/10 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        </button>
                      );
                    }

                    return (
                      <button
                        key={subProduct.id}
                        onClick={() => setSelectedStyleId(subProduct.id)}
                        className={cn(
                          "px-4 py-2 tracking-[-0.48px] transition-colors border text-sm",
                          isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted"
                        )}
                      >
                        {subProduct.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {needsSize && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Size</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => {
                    // Check availability for this size in current style
                    const variantForSize = availableVariants.find(
                      v => (getOptionValue(v.attributes, "size") || v.title) === size
                    );
                    const isAvailable = variantForSize?.availableForSale;

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

            <div className="space-y-3">
              <label className="block tracking-[-0.48px]">Quantity</label>
              <div className="flex items-center gap-3 border border-border rounded w-fit px-1 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="tracking-[-0.48px] min-w-[2ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
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
              <h2 className="text-xl font-medium tracking-[-0.48px]">
                You Might Also Like
              </h2>
              <p className="text-[#717182] tracking-[-0.48px]">
                Explore more from our collection
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to="/products/$productId"
                  params={{ productId: relatedProduct.id }}
                  className="border border-border overflow-hidden group"
                >
                  <div className="bg-[#ececf0] aspect-square overflow-hidden relative">
                    <img
                      src={relatedProduct.images?.[0]?.url}
                      alt={relatedProduct.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(relatedProduct.id);
                        }}
                        className="bg-primary text-primary-foreground px-4 py-2 text-sm tracking-[-0.48px] flex items-center gap-2"
                      >
                        <Plus className="size-4" />
                        QUICK ADD
                      </button>
                    </div>
                  </div>
                  <div className="p-4 border-t border-border">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[#717182] text-xs uppercase tracking-wider">
                          {relatedProduct.category}
                        </p>
                        <h3 className="text-sm tracking-[-0.48px]">
                          {relatedProduct.title}
                        </h3>
                      </div>
                      <span className="tracking-[-0.48px]">
                        ${relatedProduct.price}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
