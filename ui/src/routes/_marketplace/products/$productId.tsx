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
  useSuspenseProduct,
  type Product,
  type ProductImage
} from "@/integrations/marketplace-api";
import { cn } from "@/lib/utils";
import { queryClient } from "@/utils/orpc";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ProductCard } from "@/components/marketplace/product-card";
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
  attributes: Array<{ name: string; value: string }> | undefined | null,
  optionName: string
): string | undefined {
  return attributes?.find(
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
  "Light": "#F0F0F0",
  "Dark": "#1A1A1A",
  "Heather": "#999999",
  "Royal": "#4169E1",
  "Orange": "#FFA500",
  "Purple": "#800080",
  "Pink": "#FFC0CB",
  "Yellow": "#FFFF00",
  "Gold": "#FFD700",
  "Charcoal": "#36454F",
  "Grey": "#808080",
  "Gray": "#808080",
};

// Helper to get hex code from attribute if available
function getAttributeHex(
  attributes: Array<{ name: string; value: string }> | undefined,
  optionName: string
): string | undefined {
  if (!attributes) return undefined;
  const attr = attributes.find(
    (opt) => opt.name.toLowerCase() === optionName.toLowerCase()
  );
  // Cast to specific type since the backend type might not have 'hex' yet in the schema definition
  // until the user updates the backend.
  return (attr as unknown as { hex?: string })?.hex;
}

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const { data } = useSuspenseProduct(productId);
  const product = data.product;
  const mergedProducts = data.mergedProducts ?? [product];

  const [selectedStyleId, setSelectedStyleId] = useState(product.id);
  const currentStyle: Product = mergedProducts.find((p: Product) => p.id === selectedStyleId) || product;

  // Derive variants from the currently selected style
  const availableVariants = currentStyle.variants || [];
  const hasVariants = availableVariants.length > 0;

  // Deduplicate sizes and colors from the CURRENT style
  const uniqueSizes = Array.from(new Set(
    availableVariants.map((v) => getOptionValue(v.attributes, "size") || v.title)
  )).filter(Boolean) as string[];

  const uniqueColors = Array.from(new Set(
    availableVariants.map((v) => getOptionValue(v.attributes, "Color"))
  )).filter(Boolean) as string[];

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState<string>("");

  // Find variant matching selected style (currentStyle), selected size AND selected color
  const selectedVariant = availableVariants.find((v) => {
    const vSize = getOptionValue(v.attributes, "size") || v.title;
    const vColor = getOptionValue(v.attributes, "Color");

    const matchesSize = !selectedSize || vSize === selectedSize;
    const matchesColor = !uniqueColors.length || !selectedColor || vColor === selectedColor;

    return matchesSize && matchesColor;
  }) || availableVariants[0];

  const displayPrice = selectedVariant?.price || currentStyle.price;
  const selectedVariantId = selectedVariant?.id;

  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const { data: relatedData } = useProducts({
    category: product.category,
    limit: 4,
  });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== product.id && !mergedProducts.some((sp: Product) => sp.id === p.id))
    .slice(0, 3);

  // Determine display images (filter out 'detail' type/blueprints)
  const validImages = currentStyle.images.filter((img: ProductImage) => img.type !== "detail");

  // STRICTLY prioritize images over design files.
  const variantImage = validImages.find((img: ProductImage) => img.variantIds?.includes(selectedVariantId || ""));

  let sortedImages = variantImage
    ? [variantImage, ...validImages.filter((img: ProductImage) => img !== variantImage)]
    : validImages;

  if (productId === "printful-product-407012072" && sortedImages.length >= 2) {
    const [first, second, ...rest] = sortedImages;
    sortedImages = [second, first, ...rest];
  }

  const getProductImages = () => {
    if (sortedImages.length > 0) {
      return sortedImages.map((img: ProductImage) => img.url);
    }
    return [];
  };
  const productImages = getProductImages();

  // Favorites should track the MAIN product
  const isFavorite = favoriteIds.includes(product.id);

  const needsSize = requiresSize(product.category) && hasVariants && uniqueSizes.length > 0;

  const handleAddToCart = () => {
    const size = selectedSize || getOptionValue(selectedVariant?.attributes, "size") || "N/A";
    for (let i = 0; i < quantity; i++) {
      addToCart(currentStyle.id, selectedVariantId, size);
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

                  <div className="absolute inset-0 bg-transparent" />
                  <img
                    src={productImages[0]}
                    alt={product.title}
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

            <span className="text-lg tracking-[-0.48px]">
              ${displayPrice}
            </span>

            {product.description && (
              <p className="text-[#717182] tracking-[-0.48px] leading-6">
                {product.description}
              </p>
            )}

            <div className="h-px bg-border" />

            {mergedProducts.length > 1 && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Style</label>
                <div className="flex flex-wrap gap-2">
                  {mergedProducts.map((mergedProduct: Product) => {
                    const isSelected = selectedStyleId === mergedProduct.id;
                    return (
                      <button
                        key={mergedProduct.id}
                        onClick={() => {
                          setSelectedStyleId(mergedProduct.id);
                          setSelectedSize("");
                          setSelectedColor("");
                        }}
                        className={cn(
                          "px-4 py-2 tracking-[-0.48px] transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border hover:bg-muted"
                        )}
                      >
                        {mergedProduct.title}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Single Product Color Selector (Variant Colors) */}
            {uniqueColors.length > 0 && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Color</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueColors.map((color) => {
                    // Try to find the specific variant that has this color to check for metadata
                    // Ideally we'd map color -> hex in a separate pass, but finding one variant is enough
                    const sampleVariant = availableVariants.find(v =>
                      getOptionValue(v.attributes, 'Color') === color
                    );
                    const apiHex = getAttributeHex(sampleVariant?.attributes, 'Color');

                    const hex = apiHex || COLOR_MAP[color] || "#808080"; // API Hex -> Local Map -> Fallback
                    const isSelected = color === selectedColor; // Strict match

                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={cn(
                          "size-8 rounded-full border transition-all p-0.5 relative ring-offset-background",
                          isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent hover:border-border",
                          "dark:ring-offset-background" // Ensure proper offset in dark mode
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

            {/* Size Selector */}
            {hasVariants && uniqueSizes.length > 0 && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Size</label>
                <div className="flex flex-wrap gap-2">
                  {uniqueSizes.map((size) => {
                    // Check availability for this size in current style
                    const variantForSize = availableVariants.find(v => {
                      const vSize = getOptionValue(v.attributes, "size") || v.title;
                      const vColor = getOptionValue(v.attributes, "Color");

                      const matchSize = vSize === size;
                      const matchColor = !uniqueColors.length || !selectedColor || vColor === selectedColor;
                      return matchSize && matchColor;
                    });
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
