import { FavoriteButton } from "@/components/favorite-button";
import { Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { type Product } from "@/integrations/marketplace-api";

interface ProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (productId: string, productName: string) => void;
  onQuickAdd: (product: Product) => void;
}

export function ProductCard({
  product,
  isFavorite,
  onToggleFavorite,
  onQuickAdd,
}: ProductCardProps) {
  return (
    <Link
      to="/products/$productId"
      params={{ productId: product.id }}
      className="group bg-card border border-border overflow-hidden cursor-pointer"
    >
      <div className="relative bg-muted aspect-square overflow-hidden">
        <img
          src={product.images[0]?.url}
          alt={product.title}
          className="w-full h-full object-top object-cover group-hover:scale-105 transition-all duration-300"
        />
        <FavoriteButton
          isFavorite={isFavorite}
          onToggle={() => onToggleFavorite(product.id, product.title)}
        />

        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-6 transition-opacity duration-300 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onQuickAdd(product);
            }}
            className="bg-primary text-primary-foreground px-6 py-2 flex items-center gap-2 hover:bg-primary/90 transition-colors"
          >
            <Plus className="size-4" aria-hidden="true" />
            QUICK ADD
          </button>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          {product.category}
        </p>
        <h3 className="text-foreground mb-2">{product.title}</h3>
        <p className="text-foreground">${product.price}</p>
      </div>
    </Link>
  );
}
