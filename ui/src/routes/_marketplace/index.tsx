import nearLegionImage from "@/assets/images/pngs/new_nearlegion_banner1.png";
import nearAiImage from "@/assets/images/pngs/new_near_ai_banner1.png";
import { LoadingSpinner } from "@/components/loading";
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
    // Prefetch products, but don't throw errors if it fails
    try {
      await queryClient.ensureQueryData(productLoaders.featured(3));
    } catch (error) {
      // Silently fail - the component will handle the empty state
      console.warn('Failed to prefetch products:', error);
    }

    // HIDDEN: Collections feature
    //     const listData = await queryClient.ensureQueryData(
    //       collectionLoaders.list()
    //     );

    //     // Prefetch collection details so product counts can be derived from query cache. 
    //     await Promise.all(
    //       listData.collections.map((c) =>
    //         queryClient.ensureQueryData(collectionLoaders.detail(c.slug))
    //       )
    //     );
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

  const { data: featuredData, isError } = useFeaturedProducts(3);
  // const { data: collectionsData } = useSuspenseCollections(); // HIDDEN: Collections feature

  const featuredProducts = featuredData?.products ?? [];
  
  // Category filter for products section
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>('all');
  
  // Mobile product slider state
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  
  // Reset slider index when category changes
  useEffect(() => {
    setCurrentProductIndex(0);
  }, [selectedProductCategory]);
  
  // Define product type categories
  const productTypeCategoriesForFilter = [
    { key: 'all', label: 'All' },
    { key: 'tshirt', label: 'T-Shirts' },
    { key: 'hats', label: 'Hats' },
    { key: 'hoodies', label: 'Hoodies' },
    { key: 'long sleeved shirts', label: 'Long Sleeved Shirts' },
  ];
  // const collections = collectionsData. collections; // HIDDEN: Collections feature

  // Find products for banner images
  const { data: allProductsData } = useProducts({ limit: 100 });
  const allProducts = allProductsData?.products || [];
  
  // Find NEAR AI Black Long-sleeved Shirt
  const nearAiProduct = allProducts.find((p: Product) => 
    p.title.toLowerCase().includes('near ai') && 
    p.title.toLowerCase().includes('black') && 
    p.title.toLowerCase().includes('long-sleeved')
  );
  
  // Find Legion Collection Nearvana
  const legionProduct = allProducts.find((p: Product) => 
    p.title.toLowerCase().includes('legion') && 
    p.title.toLowerCase().includes('nearvana')
  );

  // Get product images (filter out mockup and detail, use variant images)
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

  const nearAiImageUrl = getProductImage(nearAiProduct) || nearAiImage;
  const legionImageUrl = getProductImage(legionProduct) || nearLegionImage;

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string) => {
    addToCart(productId, variantId, size, color);
    setSizeModalProduct(null);
    openCartSidebar();
  };

  // Get product price
  const getProductPrice = (product: Product | undefined) => {
    if (!product) return null;
    return product.price ? `$${product.price.toFixed(2)}` : null;
  };

  // Normalize product type for matching - checks both productType and product title
  const normalizeProductTypeForFilter = (product: Product): string | null => {
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
      
      // Check for hat variations in title
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
  
  // Filter products by selected category
  const filteredProducts = useMemo(() => {
    if (selectedProductCategory === 'all') {
      return featuredProducts;
    }
    
    return featuredProducts.filter((product) => {
      const normalizedType = normalizeProductTypeForFilter(product);
      return normalizedType === selectedProductCategory;
    });
  }, [featuredProducts, selectedProductCategory]);
  
  // If filtered products are less than 3, get more from allProducts
  const displayProducts = useMemo(() => {
    if (filteredProducts.length >= 3 || selectedProductCategory === 'all') {
      return filteredProducts.slice(0, 3);
    }
    
    // Get more products from allProducts to fill up to 3
    const additionalProducts = allProducts.filter((product) => {
      const normalizedType = normalizeProductTypeForFilter(product);
      return normalizedType === selectedProductCategory && !filteredProducts.some(p => p.id === product.id);
    }).slice(0, 3 - filteredProducts.length);
    
    return [...filteredProducts, ...additionalProducts].slice(0, 3);
  }, [filteredProducts, allProducts, selectedProductCategory]);

  const slides = [
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

  const nextSlide = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsAnimating(false), 100);
      }, 50);
    }
  };

  const prevSlide = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setTimeout(() => setIsAnimating(false), 100);
      }, 50);
    }
  };

  useEffect(() => {
    if (!isPaused) {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, 8000); // Auto-scroll every 8 seconds
    } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, currentSlide]);

  // Close price cart when slide changes
  const activeSlide = slides[currentSlide];

  return (
    <div className="m-0 p-0 relative">
      {/* Video background from header to products section */}
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
        {/* Overlay for better readability - only in dark mode */}
        <div className="absolute inset-0 dark:bg-background/30" />
      </div>

      {/* Hero Banner: two-column cards (fills viewport until products) */}
      <section className="pt-28 md:pt-32 relative z-10 min-h-[calc(100vh-120px)] flex items-center">
        <div className="w-full max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
          <div className="flex flex-col gap-8 lg:gap-10">
            {/* Mobile: text on right image, Desktop: Left column with text + newsletter */}
            <div className="flex flex-col lg:flex-row items-stretch gap-8 lg:gap-10">
              {/* Desktop: Left column (hidden on mobile) */}
              <div className="hidden lg:flex flex-col lg:flex-1 gap-6 lg:gap-8 lg:h-full lg:min-h-[500px] lg:md:min-h-[600px] lg:min-h-[700px]">
                {/* Left: Text content card */}
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

                {/* Newsletter banner - hidden on mobile, shown on desktop under left banner */}
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
                        className="flex-1 bg-background/60 border-border/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/60"
                      />
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-lg bg-[#00EC97] text-black font-semibold text-sm hover:bg-[#00d97f] transition-colors whitespace-nowrap"
                      >
                        Subscribe
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Right: Image card with slider controls */}
              <div
                className="flex-1 lg:flex-1 rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-3 md:px-5 py-3 md:py-5 relative min-h-[400px] md:min-h-[500px] lg:h-full lg:min-h-[500px] lg:md:min-h-[600px] lg:min-h-[700px]"
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

              {/* Mobile: text overlay inside right banner */}
              <div className="absolute inset-0 lg:hidden z-20 flex flex-col justify-between p-6 md:p-8">
                {/* Top section with badge and title */}
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

                {/* Bottom section - empty on mobile, button is in slider controls */}
              </div>

              {/* Dark overlay for better text readability on mobile */}
              <div className="absolute inset-0 lg:hidden bg-gradient-to-b from-black/60 via-black/40 to-black/60 rounded-2xl z-10 pointer-events-none" />

              {/* Price and Add to Cart (single block, expands with cart on hover) */}
              {(currentSlide === 0 || currentSlide === 1) && activeSlide.product && (
                <div className="absolute top-4 right-4 z-30">
                  <div className="rounded-lg bg-background/40 backdrop-blur-sm border border-border/40 px-3 py-1.5 flex items-center gap-0 group transition-all duration-200 hover:bg-[#00EC97] hover:border-[#00EC97] hover:px-4 hover:gap-2 overflow-hidden">
                    <p className="text-lg font-semibold text-foreground group-hover:text-black whitespace-nowrap transition-colors">
                      {activeSlide.price}
                    </p>
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
              )}

              {/* Slider controls, styled similar to header chip/buttons */}
              <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4 z-30">
                {/* Left side - Shop Items button on mobile, dots on desktop */}
                <div className="flex items-center gap-2">
                  {/* Shop Items button - shown on mobile only */}
                  <Link to="/products" search={{ category: 'all' }} className="lg:hidden">
                    <button
                      type="button"
                      className="flex items-center justify-center px-4 py-2 rounded-lg bg-[#00EC97] text-black font-semibold text-sm shadow-lg hover:bg-[#00d97f] transition-colors"
                    >
                      {activeSlide.buttonText}
                    </button>
                  </Link>
                  {/* Slider dots - hidden on mobile, shown on desktop */}
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

                {/* Right side - slider arrows */}
                <div className="flex items-center gap-2">
          <button
            onClick={prevSlide}
            type="button"
                    className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="Previous"
          >
                    <ChevronLeft className="h-6 w-6 text-foreground group-hover:text-black" aria-hidden="true" />
          </button>
          <button
            onClick={nextSlide}
            type="button"
                    className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
            aria-label="Next"
          >
                    <ChevronRight className="h-6 w-6 text-foreground group-hover:text-black" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Newsletter banner - shown on mobile below combined banner, hidden on desktop */}
            <div className="lg:hidden rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-6 md:py-8">
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
                  className="flex flex-row items-stretch gap-2"
                >
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="flex-1 bg-background/60 border-border/60 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/60"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-lg bg-[#00EC97] text-black font-semibold text-sm hover:bg-[#00d97f] transition-colors whitespace-nowrap"
                  >
                    Subscribe
          </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* == Collections Section == */}
      {/* HIDDEN: Collections section on homepage - uncomment to restore */}
      {/* <section className=" ">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-12 md:py-20 lg:py-24">
          <div className="flex flex-col items-center mb-12 text-center">
            <h2 className="mb-4 font-bold text-3xl md: text-4xl tracking-tight">Shop by Collection</h2>
            <p className="text-foreground/90 dark:text-muted-foreground text-lg max-w-2xl">
              Explore our curated collections of premium NEAR Protocol
              merchandise
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {collections.map((collection) => {
              const imageSrc = collection.image;

              // Product count is derived from the prefetched detail query. 
              const detailData = queryClient.getQueryData(
                collectionLoaders.detail(collection.slug).queryKey
              ) as { products?:  unknown[] } | undefined;
              const productCount = detailData?.products?.length ??  0;

              return (
                <Link
                  key={collection.slug}
                  to="/collections/$collection"
                  params={{ collection: collection.slug }}
                  className="group relative bg-muted overflow-hidden border border-border cursor-pointer h-[400px] md:h-[520px]"
                >
                  <div className="absolute inset-0">
                    <img
                      src={imageSrc}
                      alt={collection. name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.6)] to-[rgba(0,0,0,0)]" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-4xl mb-2">{collection.name}</h3>
                        <p className="text-white/80">{productCount} Products</p>
                      </div>
                      <button
                        type="button"
                        className="p-2 bg-white/10 backdrop-blur-sm group-hover:bg-white/20 transition-colors"
                        aria-label={`View ${collection.name} collection`}
                        onClick={(e) => e.preventDefault()}
                      >
                        <ArrowRight className="size-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section> */}
      {/* == End Collections Section == */}

      {/* Gradient transition from video to products section */}
      <div className="relative w-full h-64 md:h-96 bg-gradient-to-b from-transparent via-background/50 to-background pointer-events-none -mt-64 md:-mt-96 z-[5]" />

      {/* == Category Carousel Section == */}
      <section className="section-padding relative z-10 bg-background" id="categories">
        <div className="container-app">
          <CategoryCarousel allProducts={allProducts} />
        </div>
      </section>
      {/* == End Category Carousel Section == */}

      {/* == Products Section == */}

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
                  {isError && " The API may be temporarily unavailable. "}
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Category Filter Buttons */}
              {/* Mobile: Full width grid layout - 3 buttons first row, 2 buttons second row */}
              <div className="md:hidden grid grid-cols-3 gap-2 mb-8">
                {productTypeCategoriesForFilter.map((category, index) => {
                  // First row: All, T-Shirts, Hats (indices 0, 1, 2)
                  // Second row: Hoodies, Long Sleeved Shirts (indices 3, 4) - in one row
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
                        isSecondRow && index === 3 && "col-start-1 col-span-1", // Hoodies starts at column 1, spans 1 column
                        isSecondRow && index === 4 && "col-start-2 col-span-2" // Long Sleeved Shirts starts at column 2, spans 2 columns
                      )}
                    >
                      {category.label}
                    </button>
                  );
                })}
              </div>
              
              {/* Desktop: Centered category buttons */}
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
              
              {/* Mobile: Single product with slider */}
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
              
              {/* Desktop: Grid layout */}
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
              
              {/* View All Products Button with Mobile Slider Controls */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 md:gap-0">
                  {/* Mobile: Slider navigation buttons */}
                  {displayProducts.length > 1 && (
                    <div className="md:hidden flex items-center gap-2">
                      <button
                        onClick={() => setCurrentProductIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length)}
                        className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                        aria-label="Previous product"
                      >
                        <ChevronLeft className="h-6 w-6 text-foreground group-hover:text-black" />
                      </button>
                      <button
                        onClick={() => setCurrentProductIndex((prev) => (prev + 1) % displayProducts.length)}
                        className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                        aria-label="Next product"
                      >
                        <ChevronRight className="h-6 w-6 text-foreground group-hover:text-black" />
                      </button>
                    </div>
                  )}
                  
                  <Link
                    to="/products"
                    search={{ category: selectedProductCategory === 'all' ? 'all' : selectedProductCategory }}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors font-semibold text-base"
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

      {/* == End Products Section == */}

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

// Category Carousel Component
function CategoryCarousel({ 
  allProducts
}: { 
  allProducts: Product[]; 
}) {
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get product images (filter out mockup and detail, use variant images)
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

  // Define product type categories
  const productTypeCategories = [
    { key: 'tshirt', label: 'T-Shirts' },
    { key: 'hats', label: 'Hats' },
    { key: 'hoodies', label: 'Hoodies' },
    { key: 'long sleeved shirts', label: 'Long Sleeved Shirts' },
  ];
  
  // Normalize product type for matching - checks both productType and product title
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
      
      // Check for hat variations in title
      if (normalizedTitle.includes('hat') || normalizedTitle.includes('cap') || normalizedTitle.includes('beanie')) {
        return 'hats';
      }
      // Check for t-shirt variations in title
      if (normalizedTitle.includes('t-shirt') || normalizedTitle.includes('tshirt') || normalizedTitle.includes('tee') || normalizedTitle.includes('t shirt')) {
        return 'tshirt';
      }
      // Check for hoodie variations in title
      if (normalizedTitle.includes('hoodie') || normalizedTitle.includes('hoody') || normalizedTitle.includes('hood')) {
        return 'hoodies';
      }
      // Check for long sleeve variations in title
      if (normalizedTitle.includes('long sleeve') || normalizedTitle.includes('long-sleeve') || normalizedTitle.includes('longsleeve')) {
        return 'long sleeved shirts';
      }
    }
    
    return null;
  };

  // Group products by product type and get first product image for each type
  const categoriesWithImages = useMemo(() => {
    const grouped: Record<string, Product[]> = {};
    
    // Initialize groups
    productTypeCategories.forEach((type) => {
      grouped[type.key] = [];
    });
    
    // Group products by normalized product type (check both productType and title)
    allProducts.forEach((product) => {
      const normalizedType = normalizeProductType(product);
      if (normalizedType && grouped[normalizedType]) {
        grouped[normalizedType].push(product);
      }
    });
    
    // Return categories with products, preserving order
    // Rotate through products in each category to show different images
    return productTypeCategories
      .filter((type) => grouped[type.key].length > 0)
      .map((type) => {
        // Get random product from category or cycle through them
        const products = grouped[type.key];
        const randomIndex = Math.floor(Math.random() * products.length);
        const selectedProduct = products[randomIndex];
        return {
          category: type.label,
          categoryKey: type.key,
          image: getProductImage(selectedProduct),
          product: selectedProduct,
          allProducts: products, // Store all products for rotation
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

  // Auto-play carousel
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
    }, 5000); // Change category every 5 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [categoriesWithImages.length, isPaused, userInteracted]);

  // Show empty state if no categories found (but still show the section)
  if (categoriesWithImages.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-foreground/90 dark:text-muted-foreground">
          No product categories found. Please check product types in your inventory.
        </p>
      </div>
    );
  }

  // Get visible categories (previous, current, next)
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
      {/* Mobile: Horizontal slide carousel - only slide right */}
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
                    {/* Category Image */}
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
                    
                    {/* Category Info */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
                      <h4 className="text-2xl font-bold text-foreground mb-2 drop-shadow-lg">
                        {item.category}
                      </h4>
                      <p className="text-foreground/90 dark:text-muted-foreground text-sm">
                        Explore {item.category.toLowerCase()} collection
                      </p>
                    </div>

                    {/* Mobile Navigation Button - Inside block, bottom right */}
                    {isCurrent && (
                      <div className="absolute bottom-4 right-4 z-20">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            nextCategory();
                          }}
                          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 shadow-lg hover:shadow-xl"
                          aria-label="Next category"
                        >
                          <ChevronRight className="h-6 w-6 text-foreground group-hover:text-black" />
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

      {/* Desktop: Category Carousel with Depth Effect - Full Width */}
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
                  {/* Category Image */}
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
                  
                  {/* Category Info - Always visible with higher z-index */}
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

      {/* Desktop Navigation Arrows - Positioned at the same level as primary block bottom edge */}
      <div className="hidden md:flex lg:hidden absolute w-full items-center justify-between px-4 pointer-events-none z-40" style={{ top: 'calc(50% + 220px)' }}>
        <button
          onClick={prevCategory}
          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Previous category"
        >
          <ChevronLeft className="h-6 w-6 text-foreground group-hover:text-black" />
        </button>
        
        <button
          onClick={nextCategory}
          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Next category"
        >
          <ChevronRight className="h-6 w-6 text-foreground group-hover:text-black" />
        </button>
      </div>
      
      {/* Desktop Navigation Arrows - Large screens */}
      <div className="hidden lg:flex absolute w-full items-center justify-between px-6 pointer-events-none z-40" style={{ top: 'calc(50% + 240px)' }}>
        <button
          onClick={prevCategory}
          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Previous category"
        >
          <ChevronLeft className="h-6 w-6 text-foreground group-hover:text-black" />
        </button>
        
        <button
          onClick={nextCategory}
          className="p-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-all duration-200 pointer-events-auto shadow-lg hover:shadow-xl"
          aria-label="Next category"
        >
          <ChevronRight className="h-6 w-6 text-foreground group-hover:text-black" />
        </button>
      </div>

    </div>
  );
}
