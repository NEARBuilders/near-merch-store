import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { SizeSelectionModal } from '@/components/marketplace/size-selection-modal';
import { CartSidebar } from '@/components/marketplace/cart-sidebar';
import { ProductCard } from '@/components/marketplace/product-card';
import { useCart } from '@/hooks/use-cart';
import {
  useSuspenseCollection,
  collectionLoaders,
  type Product,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace/collections/$collection')({
  pendingComponent: LoadingSpinner,
  loader: async ({ params }) => {
    await queryClient.ensureQueryData(collectionLoaders.detail(params.collection));
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
  // Render collection features from API (no hardcoded UI metadata).
  const features = collection?.features ?? [];

  const handleAddToCart = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, size: string) => {
    addToCart(productId, size);
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
    <div className="bg-background min-h-screen w-full">
      <div className="border-b border-[rgba(0,0,0,0.1)] py-4">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <Link
            to="/collections"
            className="flex items-center gap-3 text-foreground hover:opacity-70 transition-opacity tracking-[-0.48px]"
          >
            <ArrowLeft className="size-4" />
            Back to Collections
          </Link>
        </div>
      </div>

      <div className="border-b mx-auto border-[rgba(0,0,0,0.1)]">
        <div className="grid m-6 md:p-12 md:grid-cols-2">
          <div className="bg-[#ececf0] h-[400px]  md:h-[529px] overflow-hidden">
            <img
              src={collection.image}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="border-l border-[rgba(0,0,0,0.1)] p-8 md:p-16 flex flex-col justify-center">
            <div className="space-y-8">
              <h1 className="text-2xl font-medium tracking-[-0.48px]">{collection.name}</h1>

              <p className="text-[#717182] text-lg leading-7 tracking-[-0.48px]">
                {collection.description || ''}
              </p>

              {features.length > 0 && (
                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                      <p className="tracking-[-0.48px]">{feature}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-6 pt-4 border-t border-[rgba(0,0,0,0.1)]">
                <div>
                  <p className="text-muted-foreground text-sm tracking-[-0.48px] mb-1">Products</p>
                  <p className="tracking-[-0.48px]">{products.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm tracking-[-0.48px] mb-1">Category</p>
                  <p className="tracking-[-0.48px]">{collection.name}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="py-16 md:py-20 border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="mb-12">
            <h2 className="text-xl font-medium text-neutral-950 mb-4 tracking-[-0.48px]">
              All {collection.name}
            </h2>
            <p className="text-[#717182] tracking-[-0.48px]">
              Browse our complete {collection.name.toLowerCase()} collection
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 text-center">
          <h2 className="text-xl font-medium text-foreground mb-4 tracking-[-0.48px]">
            Explore More Collections
          </h2>
          <p className="text-muted-foreground tracking-[-0.48px] mb-8">
            Discover other curated NEAR Protocol merchandise collections
          </p>
          <Link to="/collections">
            <Button variant="outline" className="border-border">
              {/* View all items */}
              View All Collections
            </Button>
          </Link>
        </div>
      </section>

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
