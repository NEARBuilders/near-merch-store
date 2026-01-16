import { LoadingSpinner } from "@/components/loading";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { ProductCard } from "@/components/marketplace/product-card";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { COLOR_MAP } from "@/lib/product-utils";

import {
  productLoaders,
  useProducts,
  useSearchProducts,
  type Product,
} from "@/integrations/api";
import { queryClient } from "@/utils/orpc";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo, useEffect } from "react";

export const Route = createFileRoute("/_marketplace/products/")({
  pendingComponent: LoadingSpinner,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      category: (search.category as string) || 'all',
    };
  },
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

type PriceRange = 'all' | 'under-50' | '50-100' | '100-200' | 'over-200';
type DiscountFilter = 'all' | 'on-sale' | 'no-discount';
type SortOption = 'relevance' | 'price-low-high' | 'price-high-low';
type SizeFilter = 'all' | string;
type ColorFilter = 'all' | string;
type CategoryFilter = 'all' | 'tshirt' | 'hats' | 'hoodies' | 'long sleeved shirts';
type BrandFilter = 'all' | string;

// Define product type categories
const PRODUCT_TYPE_CATEGORIES = [
  { key: 'tshirt', label: 'T-Shirts' },
  { key: 'hats', label: 'Hats' },
  { key: 'hoodies', label: 'Hoodies' },
  { key: 'long sleeved shirts', label: 'Long Sleeved Shirts' },
] as const;

// Normalize product type for matching - checks both productType and product title
// Returns a category key or null if no match found
const normalizeProductType = (product: Product): string | null => {
  // Check productType first
  if (product.productType) {
    const normalized = product.productType.toLowerCase().trim();
    
    // Map variations to standard categories
    if (normalized.includes('t-shirt') || normalized.includes('tshirt') || normalized.includes('tee') || normalized.includes('t shirt')) {
      return 'tshirt';
    }
    if (normalized.includes('hat') || normalized.includes('cap') || normalized.includes('beanie') || normalized.includes('cepure')) {
      return 'hats';
    }
    if (normalized.includes('hoodie') || normalized.includes('hoody') || normalized.includes('hood')) {
      return 'hoodies';
    }
    if (normalized.includes('long sleeve') || normalized.includes('long-sleeve') || normalized.includes('longsleeve') || normalized.includes('long sleeve')) {
      return 'long sleeved shirts';
    }
  }
  
  // If productType doesn't match, check product title
  if (product.title) {
    const normalizedTitle = product.title.toLowerCase().trim();
    
    // Check for hat variations in title (check first to avoid false matches with "that", "what", etc.)
    // Use word boundaries or specific patterns
    if (normalizedTitle.includes(' hat ') || normalizedTitle.endsWith(' hat') || normalizedTitle.startsWith('hat ') || 
        normalizedTitle.includes(' hat,') || normalizedTitle.includes(' hat.') ||
        normalizedTitle.includes('cap ') || normalizedTitle.includes(' beanie') || normalizedTitle.includes('cap,') || normalizedTitle.includes('cap.') ||
        normalizedTitle.includes('cap') || normalizedTitle.includes('beanie')) {
      return 'hats';
    }
    // Check for t-shirt variations in title
    if (normalizedTitle.includes('t-shirt') || normalizedTitle.includes('tshirt') || normalizedTitle.includes(' tee ') || normalizedTitle.includes('t shirt')) {
      return 'tshirt';
    }
    // Check for hoodie variations in title
    if (normalizedTitle.includes('hoodie') || normalizedTitle.includes('hoody') || normalizedTitle.includes(' hood ')) {
      return 'hoodies';
    }
    // Check for long sleeve variations in title
    if (normalizedTitle.includes('long sleeve') || normalizedTitle.includes('long-sleeve') || normalizedTitle.includes('longsleeve')) {
      return 'long sleeved shirts';
    }
  }
  
  return null;
};

function ProductsIndexPage() {
  const { addToCart } = useCart();
  const { category: urlCategory } = Route.useSearch();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  const [colorFilter, setColorFilter] = useState<ColorFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>((urlCategory as CategoryFilter) || 'all');
  const [brandFilter, setBrandFilter] = useState<BrandFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');
  
  // Update category filter when URL changes
  useEffect(() => {
    if (urlCategory && urlCategory !== 'all') {
      setCategoryFilter(urlCategory as CategoryFilter);
    } else if (!urlCategory || urlCategory === 'all') {
      setCategoryFilter('all');
    }
  }, [urlCategory]);
  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(null);
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sort: true,
    category: false,
    sizes: false,
    color: false,
    brand: false,
    price: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const { data: searchData } = useSearchProducts(searchQuery, {
    limit: 100,
  });

  const { data: allProductsData, isLoading, isError } = useProducts({
    limit: 100,
  });

  // Get unique filter options from products
  const { availableSizes, availableColors, availableBrands } = useMemo(() => {
    const allProducts = searchQuery.trim()
      ? (searchData?.products ?? [])
      : (allProductsData?.products ?? []);
    
    const sizes = new Set<string>();
    const colors = new Set<string>();
    const brands = new Set<string>();
    
    allProducts.forEach((product) => {
      // Get sizes and colors from variants
      product.variants?.forEach((variant) => {
        variant.attributes?.forEach((attr) => {
          if (attr.name === 'Size') {
            sizes.add(attr.value);
          }
          if (attr.name === 'Color') {
            colors.add(attr.value);
          }
        });
      });
      
      // Get brands
      if (product.brand) {
        brands.add(product.brand);
      }
    });
    
    return {
      availableSizes: Array.from(sizes).sort(),
      availableColors: Array.from(colors).sort(),
      availableBrands: Array.from(brands).sort(),
    };
  }, [searchQuery, searchData, allProductsData]);

  const products = useMemo(() => {
    let filteredProducts = searchQuery.trim()
      ? (searchData?.products ?? [])
      : (allProductsData?.products ?? []);

    // Filter by product type category
    if (categoryFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        const normalizedType = normalizeProductType(product);
        return normalizedType === categoryFilter;
      });
    }

    // Filter by brand
    if (brandFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        return product.brand === brandFilter;
      });
    }

    // Filter by size
    if (sizeFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        return product.variants?.some((variant) => {
          const size = variant.attributes?.find((attr) => attr.name === 'Size')?.value;
          return size === sizeFilter && variant.availableForSale;
        });
      });
    }

    // Filter by color
    if (colorFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        return product.variants?.some((variant) => {
          const color = variant.attributes?.find((attr) => attr.name === 'Color')?.value;
          return color === colorFilter && variant.availableForSale;
        });
      });
    }

    // Filter by price range
    if (priceRange !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        const price = product.price;
        switch (priceRange) {
          case 'under-50':
            return price < 50;
          case '50-100':
            return price >= 50 && price < 100;
          case '100-200':
            return price >= 100 && price < 200;
          case 'over-200':
            return price >= 200;
          default:
            return true;
        }
      });
    }

    // Filter by discount
    if (discountFilter !== 'all') {
      filteredProducts = filteredProducts.filter((product) => {
        const productHasDiscount = product.variants?.some(
          (variant) => variant.compareAtPrice && variant.compareAtPrice > variant.price
        ) ?? false;

        if (discountFilter === 'on-sale') {
          return productHasDiscount;
        } else {
          return !productHasDiscount;
        }
      });
    }

    // Sort
    const sortedProducts = [...filteredProducts].sort((a, b) => {
      if (sortBy === 'price-low-high') {
        return a.price - b.price;
      } else if (sortBy === 'price-high-low') {
        return b.price - a.price;
      } else {
        // Relevance - keep original order
        return 0;
      }
    });

    return sortedProducts;
  }, [searchQuery, searchData, allProductsData, categoryFilter, brandFilter, sizeFilter, colorFilter, priceRange, discountFilter, sortBy]);

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string) => {
    addToCart(productId, variantId, size, color);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  return (
    <div className="bg-background w-full min-h-screen pt-32">
      <div className="container-app mx-auto px-4 md:px-8 lg:px-16">
        {/* Back and Title Blocks */}
        <div className="flex flex-row gap-4 mb-8">
          {/* Back Block */}
          <Link
            to="/"
            className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8 flex items-center justify-center hover:border-[#00EC97] hover:text-[#00EC97] transition-colors shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Link>

          {/* Page Title Block */}
          <div className="flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-8 lg:px-10 py-4 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {categoryFilter === 'all' 
                  ? 'All Products' 
                  : PRODUCT_TYPE_CATEGORIES.find(cat => cat.key === categoryFilter)?.label || 'Products'}
              </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Buttons - Mobile: Grid layout, Desktop: Flex with Filter button */}
        <div className="mb-8">
          {/* Mobile: Grid layout - 3 buttons first row, 2 buttons second row, full width */}
          <div className="md:hidden grid grid-cols-3 gap-2 mb-8">
            {[
              { key: 'all' as const, label: 'All' },
              ...PRODUCT_TYPE_CATEGORIES
            ].map((category, index) => {
              const isSecondRow = index >= 3;
              return (
                <button
                  key={category.key}
                  onClick={() => setCategoryFilter(category.key)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-sm whitespace-nowrap",
                    categoryFilter === category.key
                      ? "bg-[#00EC97] border-[#00EC97] text-black"
                      : "",
                    isSecondRow && index === 3 && "col-start-1 col-span-1", // Hoodies starts at column 1, spans 1 column
                    isSecondRow && index === 4 && "col-start-2 col-span-2" // Long Sleeved Shirts starts at column 2, spans 2 columns
                  )}
                >
                  {category.label}
                </button>
              );
            })}
          </div>

          {/* Desktop: Flex layout with Filter button on the right */}
          <div className="hidden md:flex flex-wrap items-center gap-2">
            {[
              { key: 'all' as const, label: 'All' },
              ...PRODUCT_TYPE_CATEGORIES
            ].map((category) => (
              <button
                key={category.key}
                onClick={() => setCategoryFilter(category.key)}
                className={cn(
                  "inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-base",
                  categoryFilter === category.key
                    ? "bg-[#00EC97] border-[#00EC97] text-black"
                    : ""
                )}
              >
                {category.label}
              </button>
            ))}
            
            {/* Filter Button - Desktop: Same style as category buttons, positioned on the right */}
            <button
              onClick={() => setIsFilterSheetOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-base ml-auto"
              )}
            >
              <Filter className="h-4 w-4" />
              Filter
            </button>
          </div>
        </div>

        {/* Mobile: Sticky Filter Button - Bottom Right */}
        <button
          onClick={() => setIsFilterSheetOpen(true)}
          className={cn(
            "md:hidden fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 px-6 py-4 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-base shadow-lg"
          )}
        >
          <Filter className="h-5 w-5" />
          Filter
        </button>

        {/* Mobile Filter Sheet - Full Width */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetContent side="left" hideCloseButton={true} className="w-full sm:w-full overflow-y-auto p-0">
            <div className="flex flex-col h-full">
              <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <SheetTitle>Filters</SheetTitle>
              <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsFilterSheetOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
              </Button>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-6 py-6">
                <div className="flex flex-col">
                  {/* Search in Filter - At the top */}
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-background/70 border border-border/60 rounded-lg text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97] hover:border-border/60"
                    />
                  </div>

                  {/* Sort - Collapsible Section */}
                  <div className="border-b border-border/60">
                    <button
                      onClick={() => toggleSection('sort')}
                      className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-medium text-base">Sort</span>
                      {expandedSections.sort ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.sort && (
                      <div className="pb-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sortBy === 'relevance'}
                            onChange={() => setSortBy('relevance')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            sortBy === 'relevance'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">Relevance</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sortBy === 'price-low-high'}
                            onChange={() => setSortBy('price-low-high')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            sortBy === 'price-low-high'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">Price: Low to High</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sortBy === 'price-high-low'}
                            onChange={() => setSortBy('price-high-low')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            sortBy === 'price-high-low'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">Price: High to Low</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Category - Collapsible Section */}
                  <div className="border-b border-border/60">
                    <button
                      onClick={() => toggleSection('category')}
                      className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-medium text-base">Category</span>
                      {expandedSections.category ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.category && (
                      <div className="pb-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={categoryFilter === 'all'}
                            onChange={() => setCategoryFilter('all')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            categoryFilter === 'all'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">All Categories</span>
                        </label>
              {PRODUCT_TYPE_CATEGORIES.map((category) => (
                          <label key={category.key} className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={categoryFilter === category.key}
                              onChange={() => setCategoryFilter(category.key as CategoryFilter)}
                              className="sr-only"
                            />
                            <div className={cn(
                              "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                              categoryFilter === category.key
                                ? "bg-[#00EC97] border-[#00EC97]"
                                : "bg-transparent border-border/60"
                            )} />
                            <span className="text-sm">{category.label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sizes - Collapsible Section */}
                  {availableSizes.length > 0 && (
                    <div className="border-b border-border/60">
                      <button
                        onClick={() => toggleSection('sizes')}
                        className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                      >
                        <span className="font-medium text-base">Sizes</span>
                        {expandedSections.sizes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedSections.sizes && (
                        <div className="pb-4">
                          <div className="grid grid-cols-4 gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={sizeFilter === 'all'}
                                onChange={() => setSizeFilter('all')}
                                className="sr-only"
                              />
                              <div className={cn(
                                "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                                sizeFilter === 'all'
                                  ? "bg-[#00EC97] border-[#00EC97]"
                                  : "bg-transparent border-border/60"
                              )} />
                              <span className="text-sm">All</span>
                            </label>
                            {availableSizes.map((size) => (
                              <label key={size} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sizeFilter === size}
                                  onChange={() => setSizeFilter(size)}
                                  className="sr-only"
                                />
                                <div className={cn(
                                  "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                                  sizeFilter === size
                                    ? "bg-[#00EC97] border-[#00EC97]"
                                    : "bg-transparent border-border/60"
                                )} />
                                <span className="text-sm">{size}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Color - Collapsible Section with Swatches */}
                  {availableColors.length > 0 && (
                    <div className="border-b border-border/60">
                      <button
                        onClick={() => toggleSection('color')}
                        className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                      >
                        <span className="font-medium text-base">Color</span>
                        {expandedSections.color ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedSections.color && (
                        <div className="pb-4">
                          <div className="grid grid-cols-4 gap-3">
                            <label className="flex flex-col items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={colorFilter === 'all'}
                                onChange={() => setColorFilter('all')}
                                className="sr-only"
                              />
                              <div className={cn(
                                "w-10 h-10 rounded-lg border-2 transition-colors overflow-hidden",
                                colorFilter === 'all' 
                                  ? "border-[#00EC97]" 
                                  : "border-border/60 hover:border-[#00EC97]/60"
                              )}>
                                <div className="w-full h-full rounded-lg bg-gradient-to-br from-gray-200 to-gray-400" />
                              </div>
                              <span className="text-xs text-center">All</span>
                            </label>
                            {availableColors.map((color) => {
                              const colorHex = COLOR_MAP[color] || '#808080';
                              return (
                                <label key={color} className="flex flex-col items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={colorFilter === color}
                                    onChange={() => setColorFilter(color)}
                                    className="sr-only"
                                  />
                                  <div className={cn(
                                    "w-10 h-10 rounded-lg border-2 transition-colors overflow-hidden",
                                    colorFilter === color 
                                      ? "border-[#00EC97]" 
                                      : "border-border/60 hover:border-[#00EC97]/60"
                                  )}>
                                    <div
                                      className="w-full h-full rounded-lg"
                                      style={{ backgroundColor: colorHex }}
                                    />
                                  </div>
                                  <span className="text-xs text-center">{color}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Brand - Collapsible Section */}
                  {availableBrands.length > 0 && (
                    <div className="border-b border-border/60">
                      <button
                        onClick={() => toggleSection('brand')}
                        className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                      >
                        <span className="font-medium text-base">Brand</span>
                        {expandedSections.brand ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      {expandedSections.brand && (
                        <div className="pb-4 space-y-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={brandFilter === 'all'}
                              onChange={() => setBrandFilter('all')}
                              className="sr-only"
                            />
                            <div className={cn(
                              "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                              brandFilter === 'all'
                                ? "bg-[#00EC97] border-[#00EC97]"
                                : "bg-transparent border-border/60"
                            )} />
                            <span className="text-sm">All Brands</span>
                          </label>
                          {availableBrands.map((brand) => (
                            <label key={brand} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={brandFilter === brand}
                                onChange={() => setBrandFilter(brand)}
                                className="sr-only"
                              />
                              <div className={cn(
                                "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                                brandFilter === brand
                                  ? "bg-[#00EC97] border-[#00EC97]"
                                  : "bg-transparent border-border/60"
                              )} />
                              <span className="text-sm">{brand}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price - Collapsible Section */}
                  <div className="border-b border-border/60">
                    <button
                      onClick={() => toggleSection('price')}
                      className="w-full flex items-center justify-between py-4 hover:opacity-80 transition-opacity"
                    >
                      <span className="font-medium text-base">Price</span>
                      {expandedSections.price ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {expandedSections.price && (
                      <div className="pb-4 space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={priceRange === 'all'}
                            onChange={() => setPriceRange('all')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            priceRange === 'all'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">All Prices</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={priceRange === 'under-50'}
                            onChange={() => setPriceRange('under-50')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            priceRange === 'under-50'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">Under $50</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={priceRange === '50-100'}
                            onChange={() => setPriceRange('50-100')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            priceRange === '50-100'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">$50 - $100</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={priceRange === '100-200'}
                            onChange={() => setPriceRange('100-200')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            priceRange === '100-200'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">$100 - $200</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={priceRange === 'over-200'}
                            onChange={() => setPriceRange('over-200')}
                            className="sr-only"
                          />
                          <div className={cn(
                            "h-4 w-4 rounded border-2 transition-colors flex-shrink-0",
                            priceRange === 'over-200'
                              ? "bg-[#00EC97] border-[#00EC97]"
                              : "bg-transparent border-border/60"
                          )} />
                          <span className="text-sm">Over $200</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <SheetFooter className="flex-col gap-2 px-6 pb-6 pt-4 border-t border-border/60 mt-auto">
                <Button
                  onClick={() => setIsFilterSheetOpen(false)}
                  className="w-full bg-[#00EC97] text-black hover:bg-[#00EC97]/90 h-11"
                >
                  See Results ({products.length})
                </Button>
                <Button
                  onClick={() => {
                    setSearchQuery("");
                    setPriceRange("all");
                    setDiscountFilter("all");
                    setSizeFilter("all");
                    setColorFilter("all");
                    setCategoryFilter("all");
                    setBrandFilter("all");
                    setSortBy("relevance");
                  }}
                  className="w-full h-11 bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-background/80 hover:border-[#00EC97] text-foreground"
                >
                  Clear All
                </Button>
              </SheetFooter>
          </div>
          </SheetContent>
        </Sheet>

        {/* Products Grid - No Container Block */}
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
                {searchQuery
                  ? `No products found matching "${searchQuery}".`
                  : "There are currently no products available in the marketplace."}
                  {isError && " The API may be temporarily unavailable."}
                </p>
              </div>
            {(searchQuery || priceRange !== "all" || discountFilter !== "all" || sizeFilter !== "all" || colorFilter !== "all" || categoryFilter !== "all" || brandFilter !== "all") && (
                <Button
                  variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setPriceRange("all");
                  setDiscountFilter("all");
                  setSizeFilter("all");
                  setColorFilter("all");
                  setCategoryFilter("all");
                  setBrandFilter("all");
                }}
                className="mt-4 border-border/60 hover:border-[#00EC97] hover:text-[#00EC97]"
                >
                Clear All Filters
                </Button>
              )}
            </div>
          ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickAdd={handleQuickAdd}
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
