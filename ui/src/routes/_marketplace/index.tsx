import { LoadingSpinner } from "@/components/loading";
import { PageLoader } from "@/components/page-loader";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { useCartSidebarStore } from "@/stores/cart-sidebar-store";
import { ProductCard } from "@/components/marketplace/product-card";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { useCart } from "@/hooks/use-cart";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  productLoaders,
  useFeaturedProducts,
  useProducts,
  type Product
} from "@/integrations/api";
import { queryClient } from "@/utils/orpc";
import {
  createFileRoute,
  Link,
} from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";

export const Route = createFileRoute("/_marketplace/")({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    try {
      await queryClient.ensureQueryData(productLoaders.featured(3));
    } catch (error) {
      console.warn('Failed to prefetch products:', error);
    }
  },
  component: MarketplaceHome,
});

function MarketplaceHome() {
  const { addToCart } = useCart();

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(
    null
  );
  const isCartSidebarOpen = useCartSidebarStore((state) => state.isOpen);
  const closeCartSidebar = useCartSidebarStore((state) => state.close);
  const openCartSidebar = useCartSidebarStore((state) => state.open);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: featuredData, isLoading: isLoadingFeatured } = useFeaturedProducts(3);
  const featuredProducts = featuredData?.products ?? [];
  
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  
  useEffect(() => {
    setCurrentProductIndex(0);
  }, [selectedProductCategory]);
  
  const productTypeCategoriesForFilter = [
    { key: 'all', label: 'All' },
    { key: 'tshirt', label: 'T-Shirts' },
    { key: 'hats', label: 'Hats' },
    { key: 'hoodies', label: 'Hoodies' },
    { key: 'long sleeved shirts', label: 'Long Sleeved Shirts' },
  ];

  const { data: allProductsData, isLoading: isLoadingAll } = useProducts({ limit: 100 });
  const allProducts = allProductsData?.products || [];
  
  const isLoading = isLoadingFeatured || isLoadingAll;
  
  const nearAiProduct = allProducts.find((p: Product) => 
    p.title.toLowerCase().includes('near ai') && 
    p.title.toLowerCase().includes('black') && 
    p.title.toLowerCase().includes('long-sleeved')
  );
  
  const legionProduct = allProducts.find((p: Product) => 
    p.title.toLowerCase().includes('legion') && 
    p.title.toLowerCase().includes('nearvana')
  );

  const getProductImage = (product: Product | undefined) => {
    if (!product) return null;
    const variantImages = product.images?.filter(
      (img) => img.type !== "mockup" && img.type !== "detail" && img.variantIds && img.variantIds.length > 0
    ) || [];
    return variantImages[0]?.url ||
           product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url ||
           product.images?.find((img) => img.type !== "mockup" && img.type !== "detail")?.url ||
           null;
  };

  const nearAiImageUrl = getProductImage(nearAiProduct);
  const legionImageUrl = getProductImage(legionProduct);

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string) => {
    addToCart(productId, variantId, size, color);
    setSizeModalProduct(null);
    openCartSidebar();
  };

  const getProductPrice = (product: Product | undefined) => {
    if (!product) return null;
    return product.price ? `$${product.price.toFixed(2)}` : null;
  };

  const normalizeProductTypeForFilter = (product: Product): string | null => {
    if (product.productType) {
      const normalized = product.productType.toLowerCase().trim();
      
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
    
    if (product.title) {
      const normalizedTitle = product.title.toLowerCase().trim();
      
      if (normalizedTitle.includes(' hat ') || normalizedTitle.endsWith(' hat') || normalizedTitle.startsWith('hat ') || 
          normalizedTitle.includes(' hat,') || normalizedTitle.includes(' hat.') ||
          normalizedTitle.includes('cap ') || normalizedTitle.includes(' beanie') || normalizedTitle.includes('cap,') || normalizedTitle.includes('cap.') ||
          normalizedTitle.includes('cap') || normalizedTitle.includes('beanie')) {
        return 'hats';
      }
      if (normalizedTitle.includes('t-shirt') || normalizedTitle.includes('tshirt') || normalizedTitle.includes(' tee ') || normalizedTitle.includes('t shirt')) {
        return 'tshirt';
      }
      if (normalizedTitle.includes('hoodie') || normalizedTitle.includes('hoody') || normalizedTitle.includes(' hood ')) {
        return 'hoodies';
      }
      if (normalizedTitle.includes('long sleeve') || normalizedTitle.includes('long-sleeve') || normalizedTitle.includes('longsleeve')) {
        return 'long sleeved shirts';
      }
    }
    
    return null;
  };
  
  const filteredProducts = useMemo(() => {
    if (selectedProductCategory === 'all') {
      return featuredProducts;
    }
    
    return featuredProducts.filter((product) => {
      const normalizedType = normalizeProductTypeForFilter(product);
      return normalizedType === selectedProductCategory;
    });
  }, [featuredProducts, selectedProductCategory]);
  
  const displayProducts = useMemo(() => {
    if (filteredProducts.length >= 3 || selectedProductCategory === 'all') {
      return filteredProducts.slice(0, 3);
    }
    
    const additionalProducts = allProducts.filter((product) => {
      const normalizedType = normalizeProductTypeForFilter(product);
      return normalizedType === selectedProductCategory && !filteredProducts.some(p => p.id === product.id);
    }).slice(0, 3 - filteredProducts.length);
    
    return [...filteredProducts, ...additionalProducts].slice(0, 3);
  }, [filteredProducts, allProducts, selectedProductCategory]);

  const slides = useMemo(() => {
    const allSlides = [
      {
        badge: "EXCLUSIVE",
        title: "NEW LEGION",
        subtitle: "MERCH LAUNCHED",
        description:
          "Represent the NEAR Legion with New Styles",
        buttonText: "Shop Items",
        image: legionImageUrl,
        gradientFrom: "#012216",
        gradientTo: "#00ec97",
        glowColor: "#00ec97",
        price: getProductPrice(legionProduct) || "$24",
        product: legionProduct,
      },
      {
        badge: "EXCLUSIVE",
        title: "NEAR AI STYLES",
        subtitle: "AVAILABLE",
        description:
          "New styles for NEAR AI",
        buttonText: "Shop Items",
        image: nearAiImageUrl,
        gradientFrom: "#001a3d",
        gradientTo: "#0066cc",
        glowColor: "#0066ff",
        price: getProductPrice(nearAiProduct) || "$22",
        product: nearAiProduct,
      },
    ];
    
    return allSlides.filter(slide => slide.product && slide.image);
  }, [legionImageUrl, nearAiImageUrl, legionProduct, nearAiProduct]);

  const nextSlide = () => {
    if (!isAnimating && slides.length > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsAnimating(false), 100);
      }, 50);
    }
  };

  const prevSlide = () => {
    if (!isAnimating && slides.length > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setTimeout(() => setIsAnimating(false), 100);
      }, 50);
    }
  };

  useEffect(() => {
    if (slides.length > 0 && currentSlide >= slides.length) {
      setCurrentSlide(0);
    }
  }, [slides.length, currentSlide]);

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, 8000);
    } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, currentSlide, slides.length]);

  const safeCurrentSlide = slides.length > 0 ? Math.min(currentSlide, slides.length - 1) : 0;
  const activeSlide = slides.length > 0 ? slides[safeCurrentSlide] : null;

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="m-0 p-0 relative">
      <div className="absolute top-0 left-0 w-full z-0 pointer-events-none" style={{ height: 'calc(100vh - 80px)' }}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="https://videos.near.org/BKLDE_v001_NEAR_03_master_h264_small.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 dark:bg-background/30" />
      </div>

      {activeSlide && (
      <section className="pt-28 md:pt-32 relative z-10 min-h-[calc(100vh-120px)] flex items-center">
        <div className="w-full max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="flex flex-col gap-8 lg:gap-10">
            <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-10">
              <div className="hidden lg:flex flex-col lg:flex-1 gap-6 lg:gap-8 lg:h-full lg:min-h-[700px]">
                <div className="flex-1 lg:flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-10 py-8 md:py-10 flex flex-col justify-center space-y-4 md:space-y-6">
                  <div className="inline-block rounded-md bg-muted/30 px-2.5 py-0.5 text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase text-muted-foreground border border-border/40 w-fit dark:bg-[#00EC97]/10 dark:text-[#00EC97] dark:border-[#00EC97]/60">
                    {activeSlide.badge}
                  </div>

                  <div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-2">
                      {activeSlide.title}
                    </h1>
                    <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90">
                      {activeSlide.subtitle}
                    </h2>
                  </div>

                  <p className="text-sm md:text-base text-foreground/90 dark:text-muted-foreground max-w-xl">
                    {activeSlide.description}
                  </p>

                  <div className="flex items-center gap-4 pt-2">
                    <Link to="/products" search={{ category: 'all' }}>
                      <button
                        type="button"
                        className="px-6 md:px-7 py-2.5 md:py-3 rounded-lg bg-[#00EC97] text-black font-semibold text-sm shadow-sm hover:bg-[#00d97f] transition-colors"
                      >
                        {activeSlide.buttonText}
                      </button>
                    </Link>

                    <div className="hidden md:flex items-center gap-2 text-xs text-foreground/90 dark:text-muted-foreground">
                      <span className="inline-flex h-2 w-2 rounded-full bg-[#00EC97]" />
                      Curated NEAR merch drops
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-6 md:py-8 flex flex-col justify-center">
                  <div className="flex flex-col gap-4">
    <div>
                      <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground mb-2">
                        Stay Updated
                      </h3>
                      <p className="text-sm md:text-base text-foreground/90 dark:text-muted-foreground">
                        Subscribe to receive the latest NEAR merch updates and exclusive offers
                      </p>
                    </div>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newsletterEmail.trim()) {
                          toast.success("Thank you for subscribing!");
                          setNewsletterEmail("");
                        } else {
                          toast.error("Please enter a valid email address");
                        }
                      }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                    >
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        className="flex-1 h-[42px] bg-background/60 border-border/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/60"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2.5 h-[42px] rounded-lg bg-[#00EC97] text-black font-semibold text-sm hover:bg-[#00d97f] transition-colors whitespace-nowrap"
                      >
                        Subscribe
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              <div
                className="flex-1 lg:flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-3 md:px-5 py-3 md:py-5 relative min-h-[400px] md:min-h-[500px] lg:h-full lg:min-h-[700px]"
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
              >
              <div className="absolute inset-0 rounded-2xl overflow-hidden bg-black/40 flex items-end md:items-center justify-center p-8">
            {activeSlide.image && (
              <img
                    src={activeSlide.image}
                    alt={activeSlide.title}
                    className="h-auto w-auto max-h-[70%] max-w-[70%] object-contain object-center"
              />
            )}

            <div
                  className="absolute inset-0"
              style={{
                    background: `radial-gradient(circle at top left, ${activeSlide.glowColor}33 0, transparent 55%)`,
              }}
            />
              </div>

              <div className="absolute inset-0 lg:hidden z-20 flex flex-col justify-between p-6 md:p-8">
                <div className="flex flex-col gap-3">
                  <div className="inline-block rounded-md bg-black/40 px-2.5 py-0.5 text-[10px] md:text-xs font-semibold tracking-[0.16em] uppercase text-white border border-white/60 w-fit dark:bg-[#00EC97]/20 dark:text-[#00EC97] dark:border-[#00EC97]/70">
                    {activeSlide.badge}
                  </div>

                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 drop-shadow-lg">
                      {activeSlide.title}
                  </h1>
                    <h2 className="text-lg md:text-xl font-semibold tracking-tight text-white/95 drop-shadow-md">
                      {activeSlide.subtitle}
                    </h2>
                  </div>

                  <p className="text-sm md:text-base text-white/90 max-w-xs drop-shadow-md">
                    {activeSlide.description}
                  </p>
                </div>
              </div>

              <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-black/60 via-black/40 to-black/60 rounded-2xl z-10 pointer-events-none" />

              {activeSlide.product && (
                <>
                  <div className="hidden lg:block absolute top-4 right-4 z-30">
                    <div className="rounded-lg bg-background/40 backdrop-blur-sm border border-border/40 px-3 py-1.5 flex items-center gap-0 group transition-all duration-200 hover:bg-[#00EC97] hover:border-[#00EC97] hover:px-4 hover:gap-2 overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (activeSlide.product) {
                            handleQuickAdd(activeSlide.product);
                          }
                        }}
                        className="text-lg font-semibold text-foreground group-hover:text-black whitespace-nowrap transition-colors bg-transparent border-0 p-0 cursor-pointer"
                      >
                        {activeSlide.price}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (activeSlide.product) {
                            handleQuickAdd(activeSlide.product);
                          }
                        }}
                        className="flex items-center w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 transition-all duration-200 p-1.5 rounded-md bg-transparent hover:bg-transparent"
                      >
                        <ShoppingCart className="h-4 w-4 text-black" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:hidden absolute top-4 right-4 z-30">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (activeSlide.product) {
                          handleQuickAdd(activeSlide.product);
                        }
                      }}
                      className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 px-3 py-1.5 flex items-center gap-2 active:bg-[#00EC97] active:border-[#00EC97] transition-all duration-200 shadow-lg group"
                    >
                      <span className="text-base font-semibold text-foreground group-active:text-black whitespace-nowrap">
                        {activeSlide.price}
                      </span>
                      <ShoppingCart className="h-4 w-4 text-foreground group-active:text-black" />
                    </button>
                  </div>
                </>
              )}

              <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 z-30">
                <div className="flex items-center gap-2">
                  <Link to="/products" search={{ category: 'all' }} className="lg:hidden">
                    <button
                      type="button"
                      className="flex items-center justify-center px-4 py-2 rounded-lg bg-[#00EC97] text-black font-semibold text-sm shadow-lg hover:bg-[#00d97f] transition-colors"
                    >
                      {activeSlide.buttonText}
                    </button>
                  </Link>
                  <div className="hidden lg:flex items-center gap-2">
                    {slides.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setCurrentSlide(index)}
                        className={`h-1.5 rounded-full transition-all ${
                          index === currentSlide
                            ? "w-6 bg-[#00EC97]"
                            : "w-2.5 bg-muted/50"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            type="button"
                    className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="Previous"
          >
                    <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden="true" />
          </button>
          <button
            onClick={nextSlide}
            type="button"
                    className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="Next"
          >
                    <ChevronRight className="h-5 w-5 text-foreground" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>
      )}

      {activeSlide && (
            <div className="lg:hidden rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-4 md:px-6 py-4 md:py-6 relative z-10 mx-4 md:mx-8 mb-8">
              <div className="flex flex-col gap-3 md:gap-4">
                <div>
                  <h3 className="text-lg md:text-xl font-bold tracking-tight text-foreground mb-1.5 md:mb-2">
                    Stay Updated
                  </h3>
                  <p className="text-xs md:text-sm text-foreground/90 dark:text-muted-foreground">
                    Subscribe to receive the latest NEAR merch updates and exclusive offers
                  </p>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newsletterEmail.trim()) {
                      toast.success("Thank you for subscribing!");
                      setNewsletterEmail("");
                    } else {
                      toast.error("Please enter a valid email address");
                    }
                  }}
                  className="flex flex-row items-stretch gap-2"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 h-[40px] md:h-[42px] text-sm bg-background/60 border-border/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/60"
                  />
                  <button
                    type="submit"
                    className="px-4 md:px-6 py-2 md:py-2.5 h-[40px] md:h-[42px] rounded-lg bg-[#00EC97] text-black font-semibold text-xs md:text-sm hover:bg-[#00d97f] transition-colors whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
      )}

      <div className="relative w-full h-64 md:h-96 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none -mt-64 md:-mt-96 z-[5]" />

      <section className="section-padding relative z-10 bg-background" id="categories">
        <div className="container-app">
          <CategoryCarousel allProducts={allProducts} />
        </div>
      </section>

      <section className="section-padding relative z-10 bg-background pt-8 md:pt-16" id="products">
        <div className="container-app">
          {featuredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-foreground/90 dark:text-muted-foreground mb-4">
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
                  There are currently no products available in the marketplace.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="md:hidden grid grid-cols-3 gap-2 mb-8">
                {productTypeCategoriesForFilter.map((category, index) => {
                  const isSecondRow = index >= 3;
                  
                  return (
                    <button
                      key={category.key}
                      onClick={() => setSelectedProductCategory(category.key)}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-sm whitespace-nowrap",
                        selectedProductCategory === category.key
                          ? "bg-[#00EC97] border-[#00EC97] text-black"
                          : "",
                        isSecondRow && index === 3 && "col-start-1 col-span-1",
                        isSecondRow && index === 4 && "col-start-2 col-span-2"
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
              
              <div className="hidden md:flex flex-wrap items-center justify-center gap-2 mb-8">
                {productTypeCategoriesForFilter.map((category) => (
                  <button
                    key={category.key}
                    onClick={() => setSelectedProductCategory(category.key)}
                    className={cn(
                      "inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-base",
                      selectedProductCategory === category.key
                        ? "bg-[#00EC97] border-[#00EC97] text-black"
                        : ""
                    )}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
              
              <div className="md:hidden mb-8">
                {displayProducts.length > 0 && (
                  <ProductCard
                    key={displayProducts[currentProductIndex].id}
                    product={displayProducts[currentProductIndex]}
                    variant="sm"
                    onQuickAdd={handleQuickAdd}
                  />
                )}
              </div>
              
              <div className="hidden md:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {displayProducts?.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    variant="sm"
                    onQuickAdd={handleQuickAdd}
                  />
                ))}
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 md:gap-0">
                  {displayProducts.length > 1 && (
                    <div className="md:hidden flex items-center gap-2">
                      <button
                        onClick={() => setCurrentProductIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length)}
                        className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                        aria-label="Previous product"
                      >
                        <ChevronLeft className="h-5 w-5 text-foreground" />
                      </button>
                      <button
                        onClick={() => setCurrentProductIndex((prev) => (prev + 1) % displayProducts.length)}
                        className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                        aria-label="Next product"
                      >
                        <ChevronRight className="h-5 w-5 text-foreground" />
                      </button>
                    </div>
                  )}
                  
                  <Link
                    to="/products"
                    search={{ category: selectedProductCategory === 'all' ? 'all' : selectedProductCategory }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 md:px-8 md:py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-xs md:text-base"
                  >
                    {selectedProductCategory === 'all' 
                      ? 'View All Products'
                      : `View ${productTypeCategoriesForFilter.find(cat => cat.key === selectedProductCategory)?.label || 'Products'}`}
                    <ChevronRight className="hidden md:block h-5 w-5" />
                  </Link>
                </div>
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
        onClose={closeCartSidebar}
      />
    </div>
  );
}

function CategoryCarousel({ 
  allProducts
}: { 
  allProducts: Product[]; 
}) {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getProductImage = (product: Product | undefined) => {
    if (!product) return null;
    const variantImages = product.images?.filter(
      (img) => img.type !== "mockup" && img.type !== "detail" && img.variantIds && img.variantIds.length > 0
    ) || [];
    return variantImages[0]?.url ||
           product.variants?.[0]?.fulfillmentConfig?.designFiles?.[0]?.url ||
           product.images?.find((img) => img.type !== "mockup" && img.type !== "detail")?.url ||
           null;
  };

  const productTypeCategories = [
    { key: 'tshirt', label: 'T-Shirts' },
    { key: 'hats', label: 'Hats' },
    { key: 'hoodies', label: 'Hoodies' },
    { key: 'long sleeved shirts', label: 'Long Sleeved Shirts' },
  ];
  
  const normalizeProductType = (product: Product): string | null => {
    if (product.productType) {
      const normalized = product.productType.toLowerCase().trim();
      
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
    
    if (product.title) {
      const normalizedTitle = product.title.toLowerCase().trim();
      
      if (normalizedTitle.includes('hat') || normalizedTitle.includes('cap') || normalizedTitle.includes('beanie')) {
        return 'hats';
      }
      if (normalizedTitle.includes('t-shirt') || normalizedTitle.includes('tshirt') || normalizedTitle.includes('tee') || normalizedTitle.includes('t shirt')) {
        return 'tshirt';
      }
      if (normalizedTitle.includes('hoodie') || normalizedTitle.includes('hoody') || normalizedTitle.includes('hood')) {
        return 'hoodies';
      }
      if (normalizedTitle.includes('long sleeve') || normalizedTitle.includes('long-sleeve') || normalizedTitle.includes('longsleeve')) {
        return 'long sleeved shirts';
      }
    }
    
    return null;
  };

  const categoriesWithImages = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    productTypeCategories.forEach((type) => {
      grouped[type.key] = [];
    });
    
    allProducts.forEach((product) => {
      const normalizedType = normalizeProductType(product);
      if (normalizedType && grouped[normalizedType]) {
        grouped[normalizedType].push(product);
      }
    });
    
    return productTypeCategories
      .filter((type) => grouped[type.key].length > 0)
      .map((type) => {
        const products = grouped[type.key];
        const randomIndex = Math.floor(Math.random() * products.length);
        const selectedProduct = products[randomIndex];
        return {
          category: type.label,
          categoryKey: type.key,
          image: getProductImage(selectedProduct),
          product: selectedProduct,
          allProducts: products,
        };
      });
  }, [allProducts]);

  const nextCategory = () => {
    setUserInteracted(true);
    setCurrentCategoryIndex((prev) => (prev + 1) % categoriesWithImages.length);
  };

  const prevCategory = () => {
    setUserInteracted(true);
    setCurrentCategoryIndex((prev) => (prev - 1 + categoriesWithImages.length) % categoriesWithImages.length);
  };

  useEffect(() => {
    if (categoriesWithImages.length === 0 || isPaused || userInteracted) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setCurrentCategoryIndex((prev) => (prev + 1) % categoriesWithImages.length);
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [categoriesWithImages.length, isPaused, userInteracted]);

  if (categoriesWithImages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/90 dark:text-muted-foreground">
          No product categories found. Please check product types in your inventory.
        </p>
      </div>
    );
  }

  const getVisibleCategories = () => {
    const prevIndex = (currentCategoryIndex - 1 + categoriesWithImages.length) % categoriesWithImages.length;
    const nextIndex = (currentCategoryIndex + 1) % categoriesWithImages.length;
    
    return [
      { ...categoriesWithImages[prevIndex], position: 'left' as const },
      { ...categoriesWithImages[currentCategoryIndex], position: 'center' as const },
      { ...categoriesWithImages[nextIndex], position: 'right' as const },
    ];
  };

  const visibleCategories = getVisibleCategories();

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="md:hidden relative w-full overflow-hidden">
        <div 
          className="relative h-[450px] flex items-center justify-start w-full px-4"
        >
          {categoriesWithImages.map((item, index) => {
            const isCurrent = index === currentCategoryIndex;
            const isNext = index === (currentCategoryIndex + 1) % categoriesWithImages.length;
            const isVisible = isCurrent || isNext;
            
            if (!isVisible) return null;
            
            return (
              <div
                key={`${item.category}-${index}`}
                className={`absolute transition-all duration-500 ease-out ${
                  isCurrent
                    ? 'z-30'
                    : 'z-10 opacity-50'
                }`}
                style={{
                  transform: isCurrent
                    ? 'scale(1) translateX(0) translateY(0)'
                    : 'scale(0.65) translateX(calc(85% - 1rem)) translateY(0)',
                  left: isCurrent ? '1rem' : 'auto',
                  right: isCurrent ? 'auto' : '-15%',
                }}
              >
                <Link
                  to="/products"
                  search={{ category: item.categoryKey }}
                  className="block group"
                >
                  <div className="relative w-[calc(100vw-3rem)] max-w-[340px] h-[400px] rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 overflow-hidden transition-all duration-500 hover:border-[#00EC97] hover:shadow-xl">
                    {item.image ? (
                      <div className="absolute inset-0">
                        <img
                          src={item.image}
                          alt={item.category}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-muted" />
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                      <h4 className="text-2xl font-bold text-foreground mb-2 drop-shadow-lg">
                        {item.category}
                      </h4>
                      <p className="text-foreground/90 dark:text-muted-foreground text-sm">
                        Explore {item.category.toLowerCase()} collection
                      </p>
                    </div>

                    {isCurrent && (
                      <div className="absolute bottom-4 right-4 z-20">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            nextCategory();
                          }}
                          className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                          aria-label="Next category"
                        >
                          <ChevronRight className="h-5 w-5 text-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div 
        className="hidden md:block relative h-[700px] lg:h-[800px] flex items-center justify-center w-full"
        style={{ perspective: '1000px' }}
      >
        {visibleCategories.map((item, index) => {
          const isCenter = item.position === 'center';
          const isLeft = item.position === 'left';
          
          return (
            <div
              key={`${item.category}-${currentCategoryIndex}-${index}`}
              className={`absolute transition-all duration-500 ease-out ${
                isCenter
                  ? 'z-30 left-1/2'
                  : 'z-10 opacity-70 left-1/2'
              }`}
              style={{
                transform: isCenter
                  ? 'translateX(-50%) translateY(0) translateZ(0) scale(1)'
                  : isLeft
                  ? 'translateX(calc(-50% - 55%)) translateY(-3%) translateZ(-80px) scale(0.85)'
                  : 'translateX(calc(-50% + 55%)) translateY(-3%) translateZ(-80px) scale(0.85)',
                transformStyle: 'preserve-3d',
                willChange: 'transform',
              }}
            >
              <Link
                to="/products"
                search={{ category: item.categoryKey }}
                className="block group"
              >
                <div className="relative w-[580px] lg:w-[680px] h-[650px] lg:h-[720px] rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 overflow-hidden transition-all duration-500 hover:border-[#00EC97] hover:shadow-xl">
                  {item.image ? (
                    <div className="absolute inset-0">
                      <img
                        src={item.image}
                        alt={item.category}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent" />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-muted" />
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-30 pointer-events-auto" style={{ backfaceVisibility: 'visible' }}>
                    <h4 className="text-3xl md:text-4xl font-bold text-foreground mb-2 drop-shadow-lg">
                      {item.category}
                    </h4>
                    <p className="text-foreground/90 dark:text-muted-foreground text-sm md:text-base">
                      Explore {item.category.toLowerCase()} collection
                    </p>
                  </div>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="hidden md:flex lg:hidden absolute w-full items-center justify-between px-4 pointer-events-none z-40" style={{ top: 'calc(50% + 220px)' }}>
        <button
          onClick={prevCategory}
          className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Previous category"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        
        <button
          onClick={nextCategory}
          className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Next category"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>
      
      <div className="hidden lg:flex absolute w-full items-center justify-between px-6 pointer-events-none z-40" style={{ top: 'calc(50% + 240px)' }}>
        <button
          onClick={prevCategory}
          className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Previous category"
        >
          <ChevronLeft className="h-5 w-5 text-foreground" />
        </button>
        
        <button
          onClick={nextCategory}
          className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Next category"
        >
          <ChevronRight className="h-5 w-5 text-foreground" />
        </button>
      </div>

    </div>
  );
}
