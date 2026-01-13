import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
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
  const { favorites, removeFavorite } = useFavorites();
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

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-[-0.48px]">Continue Shopping</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="size-6" />
          <h1 className="text-2xl font-medium tracking-[-0.48px]">Favorites</h1>
          <span className="text-[#717182]">({favorites.length} items)</span>
        </div>

        {favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="mb-6">
              <Heart className="size-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg text-muted-foreground mb-2">No favorites yet</h3>
            <p className="text-sm text-muted-foreground max-w-[200px] mb-6">
              Click the heart icon on products to save them here
            </p>
            <Link to="/">
              <Button>Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                variant="md"
                onQuickAdd={handleQuickAdd}
                hideActions={false}
                actionSlot={
                  <button
                    onClick={() => removeFavorite(product.id)}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-border hover:border-foreground hover:bg-accent transition-colors"
                    aria-label="Remove from favorites"
                  >
                    <Trash2 className="size-4" />
                    <span>Remove</span>
                  </button>
                }
              />
            ))}
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
