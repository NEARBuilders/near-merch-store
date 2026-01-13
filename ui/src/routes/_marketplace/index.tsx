import nearLegionImage from "@/assets/images/pngs/green-near.png";
import nearAiImage from "@/assets/images/pngs/blue-near.png";
import { LoadingSpinner } from "@/components/loading";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { ProductCard } from "@/components/marketplace/product-card";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { useCart } from "@/hooks/use-cart";
import {
  productLoaders,
  useFeaturedProducts,
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
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_marketplace/")({
  pendingComponent: LoadingSpinner,
  loader: async () => {
    // Prefetch products, but don't throw errors if it fails
    try {
      await queryClient.ensureQueryData(productLoaders.featured(8));
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
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: featuredData, isError } = useFeaturedProducts(12);
  // const { data: collectionsData } = useSuspenseCollections(); // HIDDEN: Collections feature

  const featuredProducts = featuredData?.products ?? [];
  // const collections = collectionsData. collections; // HIDDEN: Collections feature

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, variantId: string, size: string, color: string) => {
    addToCart(productId, variantId, size, color);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  const slides = [
    {
      badge: "EXCLUSIVE",
      title: "NEW LEGION",
      subtitle: "MERCH LAUNCHED",
      description:
        "Represent the NEAR Legion with New Styles",
      buttonText: "Shop Items",
      image: nearLegionImage,
      gradientFrom: "#012216",
      gradientTo: "#00ec97",
      glowColor: "#00ec97",
    },
    {
      badge: "EXCLUSIVE",
      title: "NEAR AI STYLES",
      subtitle: "AVAILABLE",
      description:
        "New styles for NEAR AI",
      buttonText: "Shop Items",
      image: nearAiImage,
      gradientFrom: "#001a3d",
      gradientTo: "#0066cc",
      glowColor: "#0066ff",
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
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, currentSlide]);

  return (
    <div>
      <section
        className="relative w-full h-[500px] md:h-[600px] lg:h-[700px] overflow-hidden"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
          >
            {/* Full-width background image */}
            <img
              src={slide.image}
              alt={slide.title}
              className="absolute inset-0 w-full h-full object-cover object-center"
            />

            {/* Gradient overlay for text readability */}
            <div
              className="absolute inset-0 z-10"
              style={{
                background: `linear-gradient(to right, ${slide.gradientFrom}ee 0%, ${slide.gradientFrom}99 35%, ${slide.gradientFrom}44 65%, transparent 100%)`
              }}
            />

            {/* Content overlay */}
            <div className="absolute inset-0 z-20">
              <div className="container-app h-full flex items-center">
                <div className="text-white space-y-4 md:space-y-6 max-w-xl">
                  <div
                    className={`inline-block bg-white/10 backdrop-blur-sm px-4 py-2 text-xs md:text-sm text-white/90 uppercase font-bold tracking-wider transition-all duration-700 ease-out ${!isAnimating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                      }`}
                    style={{
                      transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {slide.badge}
                  </div>

                  <h1
                    className={`text-4xl md:text-6xl lg:text-7xl font-bold leading-tight transition-all duration-700 ease-out ${!isAnimating
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-full opacity-0"
                      }`}
                    style={{
                      transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "100ms",
                    }}
                  >
                    {slide.title}
                    <br />
                    {slide.subtitle}
                  </h1>

                  <p
                    className={`text-base md:text-lg text-white/90 transition-all duration-700 ease-out ${!isAnimating
                        ? "translate-x-0 opacity-100"
                        : "-translate-x-full opacity-0"
                      }`}
                    style={{
                      transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "200ms",
                    }}
                  >
                    {slide.description}
                  </p>

                  <Link
                    to="/products"
                    className={`inline-block bg-white text-black px-6 md:px-8 py-3 md:py-4 text-sm md:text-base font-semibold hover:bg-white/90 transition-all duration-700 ease-out ${
                      !isAnimating
                        ? "translate-y-0 opacity-100"
                        : "translate-y-full opacity-0"
                      }`}
                    style={{
                      transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "300ms",
                    }}
                  >
                    {slide.buttonText}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Navigation buttons */}
        <div className="absolute bottom-6 md:bottom-8 right-4 md:right-8 lg:right-16 flex items-center gap-3 z-30">
          <button
            onClick={prevSlide}
            type="button"
            className="group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft
              className="h-4 w-4 md:h-5 md:w-5 text-white group-hover:text-black transition-colors"
              aria-hidden="true"
            />
          </button>
          <button
            onClick={nextSlide}
            type="button"
            className="group flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
            aria-label="Next"
          >
            <ChevronRight
              className="h-4 w-4 md:h-5 md:w-5 text-white group-hover:text-black transition-colors"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      {/* == Collections Section == */}
      {/* HIDDEN: Collections section on homepage - uncomment to restore */}
      {/* <section className=" ">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-12 md:py-20 lg:py-24">
          <div className="flex flex-col items-center mb-12 text-center">
            <h2 className="mb-4 font-bold text-3xl md: text-4xl tracking-tight">Shop by Collection</h2>
            <p className="text-muted-foreground text-lg max-w-2xl">
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

      {/* == Products Section == */}

      <section className="section-padding border-t border-border" id="products">
        <div className="container-app">
          {featuredProducts.length === 0 ? (
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
                  There are currently no products available in the marketplace.
                  {isError && " The API may be temporarily unavailable. "}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts?.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onQuickAdd={handleQuickAdd}
                />
              ))}
            </div>
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
        onClose={() => setIsCartSidebarOpen(false)}
      />
    </div>
  );
}
