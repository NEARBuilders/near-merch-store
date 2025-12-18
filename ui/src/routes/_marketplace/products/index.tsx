import { LoadingSpinner } from "@/components/loading";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { ProductCard } from "@/components/marketplace/product-card";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

import {
  productLoaders,
  useProducts,
  type Product,
  type ProductCategory,
} from "@/integrations/marketplace-api";
import { queryClient } from "@/utils/orpc";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_marketplace/products/")({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    // Prefetch all products
    try {
      await queryClient.ensureQueryData(productLoaders.list({ limit: 100 }));
    } catch (error) {
      console.warn('Failed to prefetch products:', error);
    }
  },
  component: ProductsIndexPage,
});

function ProductsIndexPage() {
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);

  const { data, isLoading, isError } = useProducts({
    category: selectedCategory === 'all' ? undefined : selectedCategory,
    limit: 100,
  });

  const products = data?.products ?? [];

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string | undefined, size: string) => {
    addToCart(productId, variantId, size);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  return (
    <div className="bg-background w-full min-h-screen">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="size-4" />
            <span className="tracking-[-0.48px]">Back to Home</span>
          </Link>
        </div>
      </div>

      {/* Page Title and Filters */}
      <div className="border-b border-border">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                All Products
              </h1>
              <p className="text-muted-foreground">
                Browse our complete collection of NEAR merchandise
              </p>
            </div>

            {/* Category Filter */}
            {/* <div className="flex items-center gap-2 flex-wrap">
              <Filter className="size-4 text-muted-foreground" />
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {COLLECTIONS.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div> */}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-muted-foreground mb-4">
                <svg
                  className="mx-auto h-16 w-16 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  No Products Found
                </h3>
                <p className="text-sm max-w-md">
                  {selectedCategory === "all"
                    ? "There are currently no products available in the marketplace."
                    : `No products found in the ${selectedCategory} category.`}
                  {isError && " The API may be temporarily unavailable."}
                </p>
              </div>
              {selectedCategory !== "all" && (
                <Button
                  variant="outline"
                  onClick={() => setSelectedCategory("all")}
                  className="mt-4"
                >
                  View All Products
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6 text-sm text-muted-foreground">
                Showing {products.length}{" "}
                {products.length === 1 ? "product" : "products"}
                {selectedCategory !== "all" && ` in ${selectedCategory}`}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

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
