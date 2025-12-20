import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { AlertCircle } from 'lucide-react';
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
  const collections = collectionsData.collections;

  return (
    <div className="bg-background w-full">
      <div className="bg-muted/30 border-b border-border py-24">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="text-center space-y-6">
            <h1 className="text-2xl md:text-3xl font-medium tracking-[-0.48px]">Our Collections</h1>
            <p className="text-muted-foreground text-lg leading-7 tracking-[-0.48px] max-w-[723px] mx-auto">
              Discover premium NEAR Protocol merchandise across four curated collections. Each piece is designed with quality and sustainability in mind.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="border border-border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
              >
                <div className="bg-[#ececf0] h-[400px] md:h-[517.5px] overflow-hidden">
                  <img
                    src={imageSrc}
                    alt={collection.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="border-t border-border p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium tracking-[-0.48px]">{collection.name}</h3>
                    {collection.badge && (
                      <span className="border border-neutral-950 px-2 py-0.5 text-xs tracking-[-0.48px]">
                        {collection.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[#717182] tracking-[-0.48px] leading-6">
                    {collection.description || ''}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[#717182] text-sm tracking-[-0.48px]">
                      {productCount} Products
                    </p>
                    <span className="px-3 py-2 group-hover:bg-gray-100 transition-colors tracking-[-0.48px] text-sm">
                      Explore
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="bg-muted/30 border-t border-border py-16">
        <div className="max-w-[672px] mx-auto px-4 text-center space-y-10">
          <div className="space-y-4">
            <h2 className="text-xl font-medium tracking-[-0.48px]">Can't decide?</h2>
            <p className="text-muted-foreground tracking-[-0.48px]">
              Browse our entire collection and find the perfect piece for you.
            </p>
          </div>
          <Link to="/search">
            <Button variant="outline" className="border-border">
              View All Products
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
