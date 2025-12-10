import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { ArrowLeft, Star, Minus, Plus, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/loading';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import { ImageViewer } from '@/components/marketplace/image-viewer';
import {
  useSuspenseProduct,
  useProducts,
  productLoaders,
  SIZES,
  requiresSize,
  type Product,
} from '@/integrations/marketplace-api';
import { queryClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace/products/$productId')({
  pendingComponent: LoadingSpinner,
  loader: async ({ params }) => {
    await queryClient.ensureQueryData(productLoaders.detail(params.productId));
  },
  component: ProductDetailPage,
});

function ProductDetailPage() {
  const { productId } = Route.useParams();
  const { addToCart } = useCart();
  const { favoriteIds, toggleFavorite } = useFavorites();
  
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerImageIndex, setViewerImageIndex] = useState(0);

  const { data } = useSuspenseProduct(productId);
  const product = data.product;

  const { data: relatedData } = useProducts({ category: product.category, limit: 4 });
  const relatedProducts = (relatedData?.products ?? [])
    .filter((p) => p.id !== product.id)
    .slice(0, 3);

  const productImages = [product.image, product.image, product.image, product.image];
  const isFavorite = favoriteIds.includes(product.id);
  const needsSize = requiresSize(product.category);

  const handleAddToCart = () => {
    const size = needsSize ? selectedSize : 'N/A';
    for (let i = 0; i < quantity; i++) {
      addToCart(product.id, size);
    }
  };

  const handleImageClick = (index: number) => {
    setViewerImageIndex(index);
    setViewerOpen(true);
  };

  return (
    <div className="bg-white w-full min-h-screen">
      {viewerOpen && (
        <ImageViewer
          images={productImages}
          initialIndex={viewerImageIndex}
          onClose={() => setViewerOpen(false)}
          productName={product.name}
        />
      )}

      <div className="border-b border-[rgba(0,0,0,0.1)]">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-[-0.48px]">Back to Shop</span>
          </Link>
        </div>
      </div>

      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="w-full">
            <div className="grid grid-cols-2 gap-4 aspect-square">
              {productImages.map((img, i) => (
                <div
                  key={i}
                  className="bg-[#ececf0] w-full h-full overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => handleImageClick(i)}
                >
                  <img
                    src={img}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="inline-block border border-[rgba(0,0,0,0.1)] px-2 py-1">
                <span className="text-xs tracking-[-0.48px]">{product.category}</span>
              </div>
              <button
                onClick={() => toggleFavorite(product.id)}
                className="p-2 hover:bg-gray-100 transition-colors"
                aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart className={cn('size-5', isFavorite && 'fill-black')} />
              </button>
            </div>

            <h1 className="text-2xl font-medium tracking-[-0.48px]">{product.name}</h1>

            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[...Array(4)].map((_, i) => (
                  <Star key={i} className="size-4 fill-black stroke-black" />
                ))}
                <div className="relative size-4">
                  <Star className="size-4 fill-transparent stroke-[#717182]" />
                  <div className="absolute inset-0 overflow-hidden w-[80%]">
                    <Star className="size-4 fill-black stroke-black" />
                  </div>
                </div>
              </div>
              <span className="text-[#717182] text-sm tracking-[-0.48px]">
                4.8 (127 reviews)
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-lg tracking-[-0.48px]">${product.price}</span>
              <span className="text-[#717182] text-sm tracking-[-0.48px]">
                Free shipping on orders over $50
              </span>
            </div>

            <p className="text-[#717182] tracking-[-0.48px] leading-6">
              {product.description || 'Premium heavyweight hoodie featuring the iconic NEAR Protocol logo. Made from 100% organic cotton for ultimate comfort and sustainability.'}
            </p>

            <div className="h-px bg-[rgba(0,0,0,0.1)]" />

            {needsSize && (
              <div className="space-y-3">
                <label className="block tracking-[-0.48px]">Size</label>
                <div className="flex gap-2">
                  {SIZES.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        'px-4 py-2 tracking-[-0.48px] transition-colors',
                        selectedSize === size
                          ? 'bg-neutral-950 text-white'
                          : 'bg-white border border-[rgba(0,0,0,0.1)] hover:bg-gray-50'
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <label className="block tracking-[-0.48px]">Quantity</label>
              <div className="flex items-center gap-3 border border-[rgba(0,0,0,0.1)] rounded w-fit px-1 py-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
                  disabled={quantity <= 1}
                >
                  <Minus className="size-4" />
                </button>
                <span className="tracking-[-0.48px] min-w-[2ch] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-2 hover:bg-gray-100 rounded transition-colors"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              className="w-full bg-neutral-950 hover:bg-neutral-800"
            >
              Add to Cart - ${(product.price * quantity).toFixed(2)}
            </Button>

            <div className="h-px bg-[rgba(0,0,0,0.1)]" />

            <div className="space-y-2">
              <h4 className="tracking-[-0.48px] font-medium">Features</h4>
              <ul className="space-y-1 text-[#717182] text-sm tracking-[-0.48px]">
                <li className="flex gap-2">
                  <span>•</span>
                  <span>100% organic cotton fleece</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Heavyweight 350GSM fabric</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Screen-printed NEAR logo</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Kangaroo pocket with hidden zip</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Ribbed cuffs and hem</span>
                </li>
                <li className="flex gap-2">
                  <span>•</span>
                  <span>Unisex fit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {relatedProducts.length > 0 && (
          <div className="mt-24 space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-medium tracking-[-0.48px]">You Might Also Like</h2>
              <p className="text-[#717182] tracking-[-0.48px]">
                Explore more from our collection
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Link
                  key={relatedProduct.id}
                  to="/products/$productId"
                  params={{ productId: relatedProduct.id }}
                  className="border border-[rgba(0,0,0,0.1)] overflow-hidden group"
                >
                  <div className="bg-[#ececf0] aspect-square overflow-hidden relative">
                    <img
                      src={relatedProduct.image}
                      alt={relatedProduct.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-end justify-center pb-6 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          addToCart(relatedProduct.id);
                        }}
                        className="bg-neutral-950 text-white px-4 py-2 text-sm tracking-[-0.48px] flex items-center gap-2"
                      >
                        <Plus className="size-4" />
                        QUICK ADD
                      </button>
                    </div>
                  </div>
                  <div className="p-4 border-t border-[rgba(0,0,0,0.1)]">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <p className="text-[#717182] text-xs uppercase tracking-wider">
                          {relatedProduct.category}
                        </p>
                        <h3 className="text-sm tracking-[-0.48px]">
                          {relatedProduct.name}
                        </h3>
                      </div>
                      <span className="tracking-[-0.48px]">${relatedProduct.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
