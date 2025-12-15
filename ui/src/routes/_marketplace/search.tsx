import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Heart, Plus } from 'lucide-react';
import { LoadingSpinner } from '@/components/loading';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import {
  useSearchProducts,
  useProducts,
  productLoaders,
  COLLECTIONS,
  type Product,
  type ProductCategory,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';

type SearchParams = {
  q?: string;
  category?: string;
};

export const Route = createFileRoute('/_marketplace/search')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === 'string' ? search.q : undefined,
    category: typeof search.category === 'string' ? search.category : undefined,
  }),
  loader: async () => {
    await queryClient.ensureQueryData(productLoaders.list({ limit: 50 }));
  },
  component: SearchPage,
});

const SORT_OPTIONS = ['Featured', 'Price: Low to High', 'Price: High to Low'] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

function SearchPage() {
  const { q, category } = Route.useSearch();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();

  const [activeFilter, setActiveFilter] = useState<string>(category || 'All');
  const [sortBy, setSortBy] = useState<SortOption>('Featured');

  const filters = ['All', ...COLLECTIONS];

  const { data: searchData } = useSearchProducts(q || '', {
    category: (activeFilter !== 'All' ? activeFilter : undefined) as ProductCategory | undefined,
    limit: 50,
  });

  const { data: allProductsData } = useProducts({
    category: (activeFilter !== 'All' ? activeFilter : undefined) as ProductCategory | undefined,
    limit: 50,
  });

  const products = q ? (searchData?.products ?? []) : (allProductsData?.products ?? []);

  const sortedProducts = [...products].sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price;
    if (sortBy === 'Price: High to Low') return b.price - a.price;
    return 0;
  });

  return (
    <section className="min-h-screen py-24 border-b border-border">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-medium text-foreground mb-6 tracking-[-0.48px]">
            {q ? `Search results for "${q}"` : 'All Products'}
          </h1>
          <p className="text-lg text-[#717182] max-w-3xl mx-auto">
            Browse our complete collection of premium NEAR Protocol merchandise.{' '}
            {sortedProducts.length} products available.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={cn(
                  'px-4 py-2 border transition-colors tracking-[-0.48px]',
                  activeFilter === filter
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-foreground border-border hover:border-foreground'
                )}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[#717182]">SORT BY:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="border border-border px-4 py-2 bg-card text-foreground cursor-pointer hover:border-foreground transition-colors"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        {sortedProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedProducts.map((product) => (
              <SearchProductCard
                key={product.id}
                product={product}
                isFavorite={favoriteIds.includes(product.id)}
                onToggleFavorite={toggleFavorite}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-[#717182] text-lg">
              No products found {q ? `matching "${q}"` : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface SearchProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string, name: string) => void;
  onAddToCart: (id: string) => void;
}

function SearchProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: SearchProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group bg-card border border-border overflow-hidden cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        to="/products/$productId"
        params={{ productId: product.id }}
        className="block"
      >
        <div className="relative bg-[#ececf0] aspect-square overflow-hidden">
          <img
            src={product.primaryImage}
            alt={product.name}
            className="w-full h-full object-cover"
          />

          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite(product.id, product.name);
            }}
            className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10"
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
                onAddToCart(product.id);
              }}
              className="bg-primary text-primary-foreground px-6 py-2 flex items-center gap-2 hover:bg-primary/90 transition-colors tracking-[-0.48px] text-sm"
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
          <h3 className="text-foreground mb-2 line-clamp-2 tracking-[-0.48px] text-sm">
            {product.name}
          </h3>
          <p className="text-foreground tracking-[-0.48px]">${product.price}</p>
        </div>
      </Link>
    </div>
  );
}
