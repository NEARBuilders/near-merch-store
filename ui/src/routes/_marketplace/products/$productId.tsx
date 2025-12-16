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
import { AlertCircle, ArrowLeft, Heart, Minus, Plus } from "lucide-react";
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

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const { data } = useSuspenseProduct(productId);
  const product = data.product;

  const availableVariants = product.variants || [];
  const hasVariants = availableVariants.length > 0;
  const defaultVariant = availableVariants[0];

  const [selectedVariantId, setSelectedVariantId] = useState(defaultVariant?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const selectedVariant = availableVariants.find(v => v.id === selectedVariantId) || defaultVariant;
  const displayPrice = selectedVariant?.price || product.price;

  const { data: relatedData } = useProducts({
    category: product.category,
    limit: 4,
  });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  const getProductImages = () => {
    if (product.images && product.images.length > 0) {
      return product.images.map((img) => img.url);
    }
    const firstDesignFile = product.designFiles?.[0];
    if (firstDesignFile) {
      return [firstDesignFile.url];
    }
    const firstVariantFile = product.variants
      .flatMap(v => v.fulfillmentConfig?.designFiles || [])
      .find(f => f.url);
    if (firstVariantFile) {
      return [firstVariantFile.url];
    }
    return [];
  };
  const productImages = getProductImages();
  const isFavorite = favoriteIds.includes(product.id);
  const needsSize = requiresSize(product.category) && hasVariants;

  const handleAddToCart = () => {
    const size = getOptionValue(selectedVariant?.attributes || [], "size") 
      || selectedVariant?.title 
      || "N/A";
    for (let i = 0; i < quantity; i++) {
      addToCart(product.id, size);
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
            <div className={cn(
              "gap-4",
              productImages.length === 1
                ? "flex"
                : "grid grid-cols-2 aspect-square"
            )}>
              {productImages.map((img, i) => (
                <div
                  key={i}
                  className={cn(
                    "bg-muted overflow-hidden cursor-pointer hover:opacity-90 transition-opacity",
                    productImages.length === 1 ? "w-full aspect-square" : "w-full h-full"
                  )}
                  onClick={() => handleImageClick(i)}
                >
                  <img
                    src={img}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-block border border-border px-2 py-1">
                <span className="text-xs tracking-[-0.48px]">
                  {product.category}
                </span>
              </div>
              <button
                onClick={() => toggleFavorite(product.id)}
                className="p-2 hover:bg-gray-100 transition-colors"
                aria-label={
                  isFavorite ? "Remove from favorites" : "Add to favorites"
                }
              >
                <Heart className={cn("size-5", isFavorite && "fill-black")} />
              </button>
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

            {needsSize && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Size</label>
                <div className="flex flex-wrap gap-2">
                  {availableVariants.map((variant) => {
                    const sizeValue = getOptionValue(variant.attributes, "size") || variant.title;
                    return (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        disabled={!variant.availableForSale}
                        className={cn(
                          "px-4 py-2 tracking-[-0.48px] transition-colors",
                          selectedVariantId === variant.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-background border border-border hover:bg-muted",
                          !variant.availableForSale && "opacity-50 cursor-not-allowed line-through"
                        )}
                      >
                        {sizeValue}
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
