import { Link } from '@tanstack/react-router';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Product } from '@/integrations/marketplace-api';
import { cn } from '@/lib/utils';

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string) => void;
  onAddToCart: (productId: string) => void;
}

export function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onAddToCart,
}: ProductCardProps) {
  return (
    <div className="group relative flex flex-col">
      <Link
        to="/products/$productId"
        params={{ productId: product.id }}
        className="relative aspect-square overflow-hidden rounded-[8px] bg-[#f3f3f5]"
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </Link>

      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          onToggleFavorite(product.id);
        }}
        className={cn(
          'absolute top-2 right-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow-sm',
          isFavorite && 'text-red-500'
        )}
      >
        <Heart className={cn('h-4 w-4', isFavorite && 'fill-current')} />
      </Button>

      <div className="mt-3 flex-1">
        <p className="text-xs text-[#717182] uppercase tracking-wider mb-1">
          {product.category}
        </p>
        <Link
          to="/products/$productId"
          params={{ productId: product.id }}
          className="font-medium text-sm line-clamp-2 hover:text-[#00ec97] transition-colors"
        >
          {product.name}
        </Link>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-semibold">${product.price}</span>
        <Button
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            onAddToCart(product.id);
          }}
          className="bg-neutral-950 hover:bg-neutral-800 text-white h-8 px-3 text-xs"
        >
          <ShoppingBag className="h-3.5 w-3.5 mr-1.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
