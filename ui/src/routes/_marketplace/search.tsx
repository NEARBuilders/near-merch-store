import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { ProductCard } from '@/components/marketplace/product-card';
import {
  useSearchProducts,
  useProducts,
  productLoaders,
  type ProductCategory,
} from '@/integrations/api';
import { groupProductsByGroupId } from '@/utils/product-grouping';
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
  const [activeFilter, setActiveFilter] = useState<string>(category || 'All');
  const [sortBy, setSortBy] = useState<SortOption>('Featured');

  const filters = ['All'];

  const { data: searchData } = useSearchProducts(q || '', {
    category: (activeFilter !== 'All' ? activeFilter : undefined) as ProductCategory | undefined,
    limit: 50,
  });

  const { data: allProductsData } = useProducts({
    category: (activeFilter !== 'All' ? activeFilter : undefined) as ProductCategory | undefined,
    limit: 50,
  });

  const rawProducts = q ? (searchData?.products ?? []) : (allProductsData?.products ?? []);
  const products = groupProductsByGroupId(rawProducts);

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
              <ProductCard
                key={product.id}
                product={product}
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

