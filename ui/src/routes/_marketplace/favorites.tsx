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
    <div className="bg-white min-h-screen">
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
            <h3 className="text-lg text-[#717182] mb-2">No favorites yet</h3>
            <p className="text-sm text-[#717182] max-w-[200px] mb-6">
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
                className="flex flex-col border border-[rgba(0,0,0,0.1)] hover:border-neutral-950 transition-colors"
              >
                <Link
                  to="/products/$productId"
                  params={{ productId: product.id }}
                  className="block"
                >
                  <div className="w-full aspect-square bg-[#ececf0] overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col">
                  <p className="text-xs text-[#717182] uppercase tracking-wider mb-1">
                    {product.category}
                  </p>
                  <Link
                    to="/products/$productId"
                    params={{ productId: product.id }}
                    className="hover:text-[#00ec97] transition-colors"
                  >
                    <h4 className="text-sm text-neutral-950 mb-1 line-clamp-2">
                      {product.name}
                    </h4>
                  </Link>
                  <p className="text-sm text-neutral-950 mb-4">${product.price}</p>

                  <div className="flex gap-2 mt-auto">
                    <Button
                      onClick={() => addToCart(product.id)}
                      className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-xs h-9"
                    >
                      Add to Cart
                    </Button>
                    <button
                      onClick={() => removeFavorite(product.id)}
                      className="p-2 border border-[rgba(0,0,0,0.1)] hover:border-neutral-950 hover:bg-gray-50 transition-colors"
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
