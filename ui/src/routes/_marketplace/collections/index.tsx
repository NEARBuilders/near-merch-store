import { createFileRoute, Link, useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { AlertCircle, ArrowLeft, ChevronRight } from 'lucide-react';
import {
  useSuspenseCollections,
  collectionLoaders,
} from '@/integrations/api';
import { useQueryClient } from '@tanstack/react-query';

export const Route = createFileRoute('/_marketplace/collections/')({
  pendingComponent: LoadingSpinner,
  loader: async ({ context }) => {
    const queryClient = context.queryClient;
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
            <Button onClick={() => router.invalidate()}>Try Again</Button>
            <Button variant="outline" onClick={() => router.navigate({ to: '/' })}>
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
  const queryClient = useQueryClient();
  const { data: collectionsData } = useSuspenseCollections();
  const collections = [...(collectionsData?.collections ?? [])].sort((a, b) => {
    const aOrder = a.carouselOrder ?? 0;
    const bOrder = b.carouselOrder ?? 0;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-background min-h-screen pt-32">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          <Link
            to="/"
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Our Collections</h1>
          </div>
        </div>

        {/* Collections Grid - Banner style like homepage */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {collections.map((collection, index) => {
            const detailData = queryClient.getQueryData(
              collectionLoaders.detail(collection.slug).queryKey
            ) as { products?: unknown[] } | undefined;
            const productCount = detailData?.products?.length ?? 0;
            const glowColors = ["#00ec97", "#0066ff", "#ff6b6b", "#ffd93d", "#6c5ce7", "#00b894"];
            const glowColor = glowColors[index % glowColors.length];
            const title = (collection.carouselTitle || collection.name).split(' ').slice(0, 3).join(' ').toUpperCase();
            const subtitle = (collection.carouselTitle || collection.name).split(' ').slice(3).join(' ').toUpperCase() || "COLLECTION";
            const description = collection.carouselDescription || collection.description || `Discover ${collection.name} - exclusive NEAR merch collection`;

            return (
              <Link
                key={collection.slug}
                to="/collections/$collection"
                params={{ collection: collection.slug }}
                className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 overflow-hidden cursor-pointer hover:border-[#00EC97] hover:shadow-xl transition-all group relative min-h-[min(52vh,480px)] md:min-h-[500px] flex flex-col"
              >
                <div className="absolute inset-0 rounded-2xl overflow-hidden flex items-end md:items-center justify-center p-6 md:p-8">
                  {/* Radial gradient glow - like homepage banner */}
                  <div
                    className="absolute inset-0 z-0"
                    style={{
                      background: `radial-gradient(circle at top left, ${glowColor}33 0, transparent 55%)`,
                    }}
                  />
                  {/* Image layer */}
                  {collection.featuredProduct?.thumbnailImage ? (
                    <img
                      src={collection.featuredProduct.thumbnailImage}
                      alt={collection.name}
                      loading="lazy"
                      decoding="async"
                      className="relative z-[5] h-auto w-auto max-h-[55%] md:max-h-[70%] max-w-[70%] object-contain object-center"
                    />
                  ) : (
                    <div className="relative z-[5] flex items-center justify-center h-full w-full">
                      <span className="text-foreground/40 text-lg md:text-xl font-semibold">{collection.name}</span>
                    </div>
                  )}
                  {/* Gradient overlay - like banner */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent md:from-background/60 md:via-transparent md:to-transparent rounded-2xl z-[8] pointer-events-none" />
                </div>
                {/* Text overlay - like homepage banner */}
                <div className="relative z-10 flex flex-col justify-between flex-1 p-6 md:p-8 pt-8 md:pt-6">
                  <div className="flex flex-col gap-2 md:gap-3">
                    <div className="inline-block rounded-md bg-black/40 md:bg-muted/30 px-2.5 py-0.5 text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase text-white md:text-muted-foreground border border-white/60 md:border-border/40 w-fit dark:md:bg-[#00EC97]/10 dark:md:text-[#00EC97] dark:md:border-[#00EC97]/60">
                      {collection.badge || "COLLECTION"}
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white md:text-foreground mb-0.5 drop-shadow-lg md:drop-shadow-none">
                        {title}
                      </h3>
                      <p className="text-base md:text-lg font-semibold tracking-tight text-white/95 md:text-foreground/90 drop-shadow-md md:drop-shadow-none">
                        {subtitle}
                      </p>
                    </div>
                    <p className="text-sm md:text-base text-white/90 md:text-foreground/90 dark:md:text-muted-foreground max-w-md drop-shadow-md md:drop-shadow-none line-clamp-2">
                      {description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4">
                    <span className="text-xs md:text-sm text-white/80 md:text-foreground/70">
                      {productCount} Products
                    </span>
                    <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-[40px] rounded-lg bg-[#00EC97] text-black font-semibold text-sm group-hover:bg-[#00d97f] transition-colors whitespace-nowrap">
                      View Collection
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* View All Products */}
        <div className="flex justify-center py-8 md:py-12 mb-12">
          <Link
            to="/products"
            search={() => ({ category: '', categoryId: undefined, collection: undefined })}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 md:px-8 md:py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-xs md:text-base h-[40px] md:h-auto"
          >
            View All Products
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
