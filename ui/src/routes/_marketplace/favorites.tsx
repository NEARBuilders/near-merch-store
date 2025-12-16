import { createFileRoute, Link } from '@tanstack/react-router';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/hooks/use-favorites';
import { useCart } from '@/hooks/use-cart';

export const Route = createFileRoute('/_marketplace/favorites')({
  component: FavoritesPage,
});

function FavoritesPage() {
  const { favorites, removeFavorite } = useFavorites();
  const { addToCart } = useCart();

  return (
    <div className="bg-background min-h-screen">
      <div className="border-b border-[rgba(0,0,0,0.1)]">
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
              <Heart className="size-12 text-[#717182]" />
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
              <div
                key={product.id}
                className="flex flex-col border border-border hover:border-primary transition-colors"
              >
                <Link
                  to="/products/$productId"
                  params={{ productId: product.id }}
                  className="block"
                >
                  <div className="w-full aspect-square bg-muted overflow-hidden">
                    <img
                      src={product.images[0]?.url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    {product.category}
                  </p>
                  <Link
                    to="/products/$productId"
                    params={{ productId: product.id }}
                    className="hover:text-[#00ec97] transition-colors"
                  >
                    <h4 className="text-sm text-foreground mb-1 line-clamp-2">
                      {product.title}
                    </h4>
                  </Link>
                  <p className="text-sm text-foreground mb-4">${product.price}</p>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => addToCart(product.id)}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9"
                    >
                      Add to Cart
                    </Button>
                    <button
                      onClick={() => removeFavorite(product.id)}
                      className="p-2 border border-border hover:border-foreground hover:bg-accent transition-colors"
                      aria-label="Remove from favorites"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
