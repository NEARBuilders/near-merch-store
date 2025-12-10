import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/marketplace/product-card';
import { LoadingSpinner } from '@/components/loading';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import {
  useSuspenseFeaturedProducts,
  useSuspenseCollections,
  productLoaders,
  collectionLoaders,
  type ProductCategory,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace/')({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    await Promise.all([
      queryClient.ensureQueryData(productLoaders.featured(8)),
      queryClient.ensureQueryData(collectionLoaders.list()),
    ]);
  },
  component: MarketplaceHome,
});

function MarketplaceHome() {
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const { data: featuredData } = useSuspenseFeaturedProducts(8);
  const { data: collectionsData } = useSuspenseCollections();

  const featuredProducts = featuredData.products;
  const collections = collectionsData.collections;

  return (
    <div>
      <section className="relative bg-gradient-to-b from-[#012216] to-[#00ec97] text-white py-24 md:py-32 lg:py-40 overflow-hidden">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              NEAR Protocol
              <br />
              <span className="text-[#00ec97]">Official Merch</span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8">
              Show your support for the open web with exclusive NEAR Protocol
              merchandise. Quality apparel and accessories for the community.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/collections">
                <Button size="lg" className="bg-white text-black hover:bg-white/90">
                  Shop Collections
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
          <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#00ec97] blur-[100px]" />
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Shop by Collection</h2>
            <Link
              to="/collections"
              className="text-sm font-medium hover:text-[#00ec97] transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {collections.map((collection) => {
              const category = collection.slug.charAt(0).toUpperCase() + collection.slug.slice(1) as ProductCategory;
              return (
                <Link
                  key={collection.slug}
                  to="/collections/$collection"
                  params={{ collection: collection.slug }}
                  className="group relative aspect-square rounded-[16px] overflow-hidden bg-[#f3f3f5]"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="font-semibold text-lg">{collection.name}</h3>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-[#f3f3f5]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">Featured Products</h2>
            <Link
              to="/search"
              className="text-sm font-medium hover:text-[#00ec97] transition-colors flex items-center gap-1"
            >
              View All <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Join the NEAR Community
          </h2>
          <p className="text-[#717182] max-w-xl mx-auto mb-8">
            Be part of the open web movement. Follow us for updates, exclusive drops,
            and community events.
          </p>
          <div className="flex justify-center gap-4">
            <Button variant="outline" className="border-neutral-950">
              Twitter
            </Button>
            <Button variant="outline" className="border-neutral-950">
              Discord
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
