import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';
import { ProductCard } from '@/components/marketplace/product-card';
import { SizeSelectionModal } from '@/components/marketplace/size-selection-modal';
import { CartSidebar } from '@/components/marketplace/cart-sidebar';
import { type Product } from '@/integrations/api';
import { useState } from 'react';

export const Route = createFileRoute('/_marketplace/favorites')({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, isLoading } = useFavorites();
  const { addToCart } = useCart();

  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string) => {
    addToCart(productId, variantId, size, color);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  const favoritesList = favorites || [];
  const favoritesCount = favoritesList.length;

  return (
    <div className="bg-background min-h-screen pt-32">
      <div className="container-app mx-auto px-4 md:px-8 lg:px-16">
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
            <div className="flex items-center gap-3">
              <Heart className="size-6 fill-[#00EC97] stroke-[#00EC97]" />
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Favorites</h1>
              {!isLoading && (
                <span className="text-foreground/90 dark:text-muted-foreground text-sm">
                  ({favoritesCount} {favoritesCount === 1 ? 'item' : 'items'})
                </span>
              )}
        </div>
      </div>
        </div>

        {isLoading ? (
          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 text-center">
            <p className="text-foreground/90 dark:text-muted-foreground">Loading favorites...</p>
          </div>
        ) : favoritesCount === 0 ? (
          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-12 md:py-16 text-center">
            <div className="mb-6 flex justify-center">
              <Heart className="size-12 text-foreground/50 dark:text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No favorites yet</h3>
            <p className="text-sm text-foreground/90 dark:text-muted-foreground max-w-[200px] mx-auto mb-6">
              Click the heart icon on products to save them here
            </p>
            <Link to="/">
              <button className="px-8 py-3 rounded-lg bg-[#00EC97] text-black font-semibold text-sm hover:bg-[#00d97f] transition-colors">
                Browse Products
              </button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-background border border-border/60 px-6 md:px-8 lg:px-10 py-6 md:py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favoritesList.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="md"
                onQuickAdd={handleQuickAdd}
                hideActions={false}
              />
            ))}
            </div>
          </div>
        )}
      </div>

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
