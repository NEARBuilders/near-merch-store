import { Link } from "@tanstack/react-router";
import { Heart, Plus } from "lucide-react";
import { type Product } from "@/integrations/marketplace-api";
import { cn } from "@/lib/utils";
import { useState } from "react";

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
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAnimating(true);
    onToggleFavorite(product.id, product.title);
    setTimeout(() => setIsAnimating(false), 600);
  };

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
        <button
          type="button"
          onClick={handleToggleFavorite}
          className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10"
          aria-label="Add to favorites"
        >
          <Heart
            className={cn(
              "size-4 transition-all duration-300 cursor-pointer",
              isFavorite ? "fill-red-500 stroke-red-500" : "stroke-foreground",
              isAnimating && "animate-heart-pop"
            )}
            aria-hidden="true"
          />
        </button>
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
