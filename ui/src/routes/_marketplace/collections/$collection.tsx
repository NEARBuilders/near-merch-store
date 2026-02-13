import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, AlertCircle, Square, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { SizeSelectionModal } from '@/components/marketplace/size-selection-modal';
import { CartSidebar } from '@/components/marketplace/cart-sidebar';
import { ProductCard } from '@/components/marketplace/product-card';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';
import {
  useSuspenseCollection,
  collectionLoaders,
  type Product,
} from '@/integrations/api';

export const Route = createFileRoute('/_marketplace/collections/$collection')({
  pendingComponent: LoadingSpinner,
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(collectionLoaders.detail(params.collection));
  },
  errorComponent: ({ error }) => {
    const router = useRouter();

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Unable to Load Collection</h2>
          </div>
          <p className="text-gray-600">
            {error.message || 'Failed to load collection data. Please check your connection and try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.invalidate()}>
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.navigate({ to: '/collections' })}
            >
              Back to Collections
            </Button>
          </div>
        </div>
      </div>
    );
  },
  component: CollectionDetailPage,
});

function CollectionDetailPage() {
  const { collection: collectionSlug } = Route.useParams();
  const { addToCart } = useCart();
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

  const { data } = useSuspenseCollection(collectionSlug);
  const { collection, products } = data;
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');

  const handleAddToCart = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string, imageUrl?: string) => {
    addToCart(productId, variantId, size, color, imageUrl);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  if (!collection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-medium mb-4">Collection Not Found</h1>
          <Link to="/collections" className="text-[#00ec97] hover:underline">
            Back to Collections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen pt-32">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Block */}
          <Link
            to="/collections"
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Title Block */}
          <div className="flex-1 rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{collection.name}</h1>
        </div>
      </div>

        {/* Products Section */}
        <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-8 md:py-10 mb-12">
          <div className="flex items-center justify-between gap-2 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="text-foreground/90 dark:text-muted-foreground text-sm md:text-base">
                  {collection.description}
                </p>
              )}
            </div>

            <div className="md:hidden flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('single')}
                className={cn(
                  "p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 transition-colors",
                  viewMode === 'single'
                    ? "bg-[#00EC97] border-[#00EC97] text-black"
                    : "hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
                aria-label="Single view"
              >
                <Square className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 transition-colors",
                  viewMode === 'grid'
                    ? "bg-[#00EC97] border-[#00EC97] text-black"
                    : "hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black"
                )}
                aria-label="Grid view"
              >
                <Grid3x3 className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="md:hidden mb-8">
            {viewMode === 'single' ? (
              <div>
                {products.length > 0 && (
                  <ProductCard
                    key={products[0]?.id}
                    product={products[0]}
                    onQuickAdd={handleAddToCart}
                    variant="lg"
                  />
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickAdd={handleAddToCart}
                    variant="lg"
                  />
                ))}
              </div>
            )}
          </div>

          <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onQuickAdd={handleAddToCart}
                variant="lg"
              />
            ))}
          </div>
        </div>

        {/* Explore More Section */}
        <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 mb-12 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-4">
            Explore More Collections
          </h2>
          <p className="text-foreground/90 dark:text-muted-foreground text-sm md:text-base mb-8">
            Discover other curated NEAR Protocol merchandise collections
          </p>
          <Link to="/collections">
            <button
              type="button"
              className="px-8 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-base hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors mx-auto"
            >
              View All Collections
            </button>
          </Link>
        </div>
      </div>

      <SizeSelectionModal
        product={sizeModalProduct}
        isOpen={!!sizeModalProduct}
        onClose={() => setSizeModalProduct(null)}
        onAddToCart={handleAddToCartFromModal}
      />

      <CartSidebar
        isOpen={isCartSidebarOpen}
        onClose={() => setIsCartSidebarOpen(false)}
      />
    </div>
  );
}
