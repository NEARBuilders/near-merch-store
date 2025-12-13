import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Heart, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { SizeSelectionModal } from '@/components/marketplace/size-selection-modal';
import { CartSidebar } from '@/components/marketplace/cart-sidebar';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import {
  useSuspenseCollection,
  collectionLoaders,
  type Product,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';
import menCollectionsImage from "@/assets/images/pngs/men_collections.avif";
import womenCollectionsImage from "@/assets/images/pngs/women_collections.avif";
import nearLegionImage from "@/assets/images/pngs/accessories.avif";
import accessoriesImage from "@/assets/images/pngs/accessories.avif";

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

// Extended metadata for collections (features and descriptions not in API)
const collectionMetadata: Record<string, {
  description: string;
  features: string[];
}> = {
  men: {
    description: 'Premium fits designed specifically for men. From classic essentials to modern oversized styles, each piece is crafted with attention to detail and comfort.',
    features: [
      'Regular & Oversized Fits',
      'Premium 100% Cotton',
      'Modern Minimalist Designs',
      'Durable Construction',
    ],
  },
  women: {
    description: 'Tailored fits designed for women. Comfortable, stylish, and sustainably made pieces that blend fashion with function.',
    features: [
      'Fitted & Crop Styles',
      'Premium Soft Fabrics',
      'Versatile Designs',
      'Sustainable Materials',
    ],
  },
  exclusives: {
    description: "Limited edition designs created in collaboration with artists. Once they're gone, they're gone forever.",
    features: [
      'Limited Edition Items',
      'Artist Collaborations',
      'Unique Designs',
      'Collectible Pieces',
    ],
  },
  accessories: {
    description: 'Complete your look with our curated selection. From everyday essentials to statement pieces.',
    features: [
      'Functional & Stylish',
      'Premium Materials',
      'Versatile Designs',
      'Perfect for Gifting',
    ],
  },
};

const collectionImages: Record<string, string> = {
  men: menCollectionsImage,
  women: womenCollectionsImage,
  exclusives: nearLegionImage,
  accessories: accessoriesImage,
};

function CollectionDetailPage() {
  const { collection: collectionSlug } = Route.useParams();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

  const { data } = useSuspenseCollection(collectionSlug);
  const { collection, products } = data;
  const metadata = collectionMetadata[collectionSlug];

  const handleAddToCart = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, size: string) => {
    addToCart(productId, size);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  if (!collection || !metadata) {
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
    <div className="bg-white min-h-screen w-full">
      <div className="border-b border-[rgba(0,0,0,0.1)] py-4">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <Link
            to="/collections"
            className="flex items-center gap-3 text-neutral-950 hover:opacity-70 transition-opacity tracking-[-0.48px]"
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
              src={collectionImages[collectionSlug] || menCollectionsImage}
              alt={collection.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="border-l border-[rgba(0,0,0,0.1)] p-8 md:p-16 flex flex-col justify-center">
            <div className="space-y-8">
              <h1 className="text-2xl font-medium tracking-[-0.48px]">{collection.name}</h1>
              
              <p className="text-[#717182] text-lg leading-7 tracking-[-0.48px]">
                {metadata?.description || collection.description || ''}
              </p>

              {metadata?.features && (
                <div className="space-y-3">
                  {metadata.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-neutral-950 rounded-full" />
                      <p className="tracking-[-0.48px]">{feature}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-6 pt-4 border-t border-[rgba(0,0,0,0.1)]">
                <div>
                  <p className="text-[#717182] text-sm tracking-[-0.48px] mb-1">Products</p>
                  <p className="tracking-[-0.48px]">{products.length}</p>
                </div>
                <div>
                  <p className="text-[#717182] text-sm tracking-[-0.48px] mb-1">Category</p>
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
              <CollectionProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 text-center">
          <h2 className="text-xl font-medium text-neutral-950 mb-4 tracking-[-0.48px]">
            Explore More Collections
          </h2>
          <p className="text-[#717182] tracking-[-0.48px] mb-8">
            Discover other curated NEAR Protocol merchandise collections
          </p>
          <Link to="/collections">
            <Button variant="outline" className="border-[rgba(0,0,0,0.1)]">
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

interface CollectionProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string, name: string) => void;
  onAddToCart: (product: Product) => void;
}

function CollectionProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: CollectionProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group bg-white border border-[rgba(0,0,0,0.1)] overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to="/products/$productId"
        params={{ productId: product.id }}
        className="block"
      >
        <div className="relative bg-[#ececf0] aspect-square overflow-hidden">
          <img src={product.images[0]?.url} alt={product.name} className="w-full h-full object-cover" />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(product.id, product.name);
            }}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm hover:bg-white transition-all z-10"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={cn('size-4', isFavorite ? 'fill-black stroke-black' : 'stroke-black')}
            />
          </button>

          <div
            className={cn(
              'absolute bottom-0 left-0 right-0 flex items-center justify-center p-6 transition-opacity duration-300',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              className="bg-neutral-950 text-white px-6 py-2 flex items-center gap-2 hover:bg-neutral-800 transition-colors tracking-[-0.48px] text-sm"
            >
              <Plus className="size-4" />
              QUICK ADD
            </button>
          </div>
        </div>

        <div className="p-4">
          <p className="text-xs text-[#717182] uppercase tracking-wider mb-1">
            {product.category}
          </p>
          <h3 className="text-neutral-950 mb-2 line-clamp-2 tracking-[-0.48px] text-sm">
            {product.name}
          </h3>
          <p className="text-neutral-950 tracking-[-0.48px]">${product.price}</p>
        </div>
      </Link>
    </div>
  );
}
