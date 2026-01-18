import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { ProductCard } from '@/components/marketplace/product-card';
import {
  useSearchProducts,
  useProducts,
  productLoaders,
  type ProductCategory,
} from '@/integrations/api';
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

function SearchPage() {
  const { q, category } = Route.useSearch();

  const { data: searchData } = useSearchProducts(q || '', {
    category: category as ProductCategory | undefined,
    limit: 50,
  });

  const { data: allProductsData } = useProducts({
    category: category as ProductCategory | undefined,
    limit: 50,
  });

  const products = q ? (searchData?.products ?? []) : (allProductsData?.products ?? []);

  return (
    <section className="section-padding relative z-10 bg-background pt-32">
      <div className="container-app">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Block */}
          <Link
            to="/"
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Title Block */}
          <div className="flex-1 rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                  {q ? `Search results for "${q}"` : 'All Products'}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 text-center">
            <p className="text-lg font-medium text-foreground/90 dark:text-muted-foreground">
              No products found {q ? `matching "${q}"` : ''}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

