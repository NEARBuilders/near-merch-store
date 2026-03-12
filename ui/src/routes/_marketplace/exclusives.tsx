import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ArrowLeft, Square, Grid3x3, Search } from "lucide-react";
import { LoadingSpinner } from "@/components/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { ProductCard } from "@/components/marketplace/product-card";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import {
  useProducts,
  type Product,
} from "@/integrations/api";
import { VideoBackground } from "@/components/video-background";

export const Route = createFileRoute("/_marketplace/exclusives")({
  component: ExclusivesPage,
});

type SortOption = 'relevance' | 'price-low-high' | 'price-high-low';

function ExclusivesPage() {
  const { addToCart } = useCart();
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'single' | 'grid'>('single');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  const { data: productsData, isLoading } = useProducts({
    exclusive: true,
    limit: 100,
  });

  const products = useMemo(() => {
    let filtered = productsData?.products ?? [];

    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(queryLower) ||
          p.description?.toLowerCase().includes(queryLower)
      );
    }

    switch (sortBy) {
      case 'price-low-high':
        filtered = [...filtered].sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        filtered = [...filtered].sort((a, b) => b.price - a.price);
        break;
      default:
        break;
    }

    return filtered;
  }, [productsData, searchQuery, sortBy]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 pb-16 relative flex items-center justify-center">
        <VideoBackground />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-16 relative">
      <VideoBackground />
      
      <div className="relative z-10 max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
        <div className="flex flex-row gap-4 mb-8">
          <Link
            to="/products"
            search={{ category: "all", categoryId: undefined, collection: undefined }}
            className="rounded-2xl border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Exclusives
            </h1>
            <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-2">
              Limited edition products with creator royalties
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 py-12 text-center">
            <p className="text-foreground/70 dark:text-muted-foreground">
              No exclusive products available yet. Check back soon!
            </p>
            <Link
              to="/products"
              search={{ category: "all", categoryId: undefined, collection: undefined }}
              className="inline-block mt-4 text-[#00EC97] hover:underline"
            >
              Browse all products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/50 dark:text-muted-foreground" />
                <Input
                  placeholder="Search exclusives..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/60 border border-border/60 rounded-lg"
                />
              </div>
              <div className="flex gap-2">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-40 bg-background/60 border border-border/60">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="price-low-high">Price: Low to High</SelectItem>
                    <SelectItem value="price-high-low">Price: High to Low</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('single')}
                    className={cn(
                      "p-2 rounded-lg border border-border/60 transition-colors",
                      viewMode === 'single' ? "bg-[#00EC97] text-black" : "bg-background/60 hover:bg-background/80"
                    )}
                  >
                    <Square className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-2 rounded-lg border border-border/60 transition-colors",
                      viewMode === 'grid' ? "bg-[#00EC97] text-black" : "bg-background/60 hover:bg-background/80"
                    )}
                  >
                    <Grid3x3 className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className={cn(
              "gap-4",
              viewMode === 'grid' ? "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "flex flex-col"
            )}>
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={viewMode === 'grid' ? "md" : "horizontal"}
                  onQuickAdd={(p) => setSizeModalProduct(p)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <SizeSelectionModal
        product={sizeModalProduct}
        isOpen={!!sizeModalProduct}
        onClose={() => setSizeModalProduct(null)}
        onAddToCart={(productId, variantId, size, color, imageUrl) => {
          addToCart(productId, variantId, size, color, imageUrl);
          setSizeModalProduct(null);
        }}
      />
    </div>
  );
}
