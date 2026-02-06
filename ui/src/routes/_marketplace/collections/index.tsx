import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import {
  useSuspenseCollections,
  collectionLoaders,
} from '@/integrations/api';
import { queryClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace/collections/')({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    // Prefetch collection list + details so UI can show accurate counts without hardcoding.
    const listData = await queryClient.ensureQueryData(collectionLoaders.list());
    await Promise.all(
      listData.collections.map((c) =>
        queryClient.ensureQueryData(collectionLoaders.detail(c.slug))
      )
    );
  },
  errorComponent: ({ error }) => {
    const router = useRouter();

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-red-600">
            <AlertCircle className="h-12 w-12 mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Unable to Load Collections</h2>
          </div>
          <p className="text-gray-600">
            {error.message || 'Failed to load collections. Please check your connection and try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => router.invalidate()}>
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => router.navigate({ to: '/' })}
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  },
  component: CollectionsPage,
});

function CollectionsPage() {
  const { data: collectionsData } = useSuspenseCollections();
  const collections = [...(collectionsData?.collections ?? [])].sort((a, b) => {
    const aOrder = a.carouselOrder ?? 0;
    const bOrder = b.carouselOrder ?? 0;
    
    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }
    
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-background min-h-screen pt-32">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
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
            <div className="text-center space-y-4">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Our Collections</h1>
              <p className="text-foreground/90 dark:text-muted-foreground text-sm md:text-base max-w-[723px] mx-auto">
              Discover premium NEAR Protocol merchandise across four curated collections. Each piece is designed with quality and sustainability in mind.
            </p>
          </div>
        </div>
      </div>

        {/* Collections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {collections.map((collection) => {
            const imageSrc = collection.image || '/ui/src/assets/images/pngs/man_on_near.png';

            // Product count comes from the prefetched detail query.
            const detailData = queryClient.getQueryData(
              collectionLoaders.detail(collection.slug).queryKey
            ) as { products?: unknown[] } | undefined;
            const productCount = detailData?.products?.length ?? 0;
            
            return (
              <Link
                key={collection.slug}
                to="/collections/$collection"
                params={{ collection: collection.slug }}
                className="rounded-2xl bg-background border border-border/60 overflow-hidden cursor-pointer hover:border-[#00EC97] hover:shadow-xl transition-all group"
              >
                <div className="bg-[#ececf0] h-[400px] md:h-[517.5px] overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={collection.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{collection.name}</h3>
                    {collection.badge && (
                      <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground border border-border/40 dark:bg-[#00EC97]/10 dark:text-[#00EC97] dark:border-[#00EC97]/60">
                        {collection.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground/90 dark:text-muted-foreground text-sm leading-6">
                    {collection.description || ''}
                  </p>
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-foreground/70 dark:text-muted-foreground text-sm">
                      {productCount} Products
                    </p>
                    <span className="px-4 py-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 group-hover:bg-[#00EC97] group-hover:border-[#00EC97] group-hover:text-black transition-colors text-sm font-semibold">
                      Explore
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
      </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 mb-12">
          <div className="max-w-[672px] mx-auto text-center space-y-6">
          <div className="space-y-4">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Can't decide?</h2>
              <p className="text-foreground/90 dark:text-muted-foreground text-sm md:text-base">
              Browse our entire collection and find the perfect piece for you.
            </p>
          </div>
            <Link to="/products" search={() => ({ category: "", categoryId: undefined, collection: undefined })}>
              <button
                type="button"
                className="px-8 py-3 rounded-lg bg-[#00EC97] text-black flex items-center justify-center font-semibold text-base hover:bg-[#00d97f] transition-colors mx-auto"
              >
              View All Products
              </button>
          </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
