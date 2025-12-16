import manOnNearImage from "@/assets/images/pngs/man_on_near.png";
import { LoadingSpinner } from "@/components/loading";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { ProductCard } from "@/components/marketplace/product-card";
import { SizeSelectionModal } from "@/components/marketplace/size-selection-modal";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import {
  // useSuspenseCollections, // HIDDEN: Collections feature
  productLoaders,
  useFeaturedProducts,
  type Product
} from "@/integrations/marketplace-api";
import { queryClient } from "@/utils/orpc";
import {
  createFileRoute,
    /* Link, */
} from "@tanstack/react-router"; // HIDDEN: Link for collections
import {
  // ArrowRight, // HIDDEN: Collections feature
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
  const { favoriteIds, toggleFavorite } = useFavorites();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const [sizeModalProduct, setSizeModalProduct] = useState<Product | null>(
    null
  );
  const [isCartSidebarOpen, setIsCartSidebarOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: featuredData, isLoading, isError } = useFeaturedProducts(12);
  // const { data: collectionsData } = useSuspenseCollections(); // HIDDEN: Collections feature

  const featuredProducts = featuredData?.products ?? [];
  // const collections = collectionsData.collections; // HIDDEN: Collections feature

  const handleQuickAdd = (product: Product) => {
    setSizeModalProduct(product);
  };

  const handleAddToCartFromModal = (productId: string, size: string) => {
    addToCart(productId, size);
    setSizeModalProduct(null);
    setIsCartSidebarOpen(true);
  };

  const slides = [
    {
      badge: "New Collection",
      title: "NEAR LEGION",
      subtitle: "COLLECTION",
      description:
        "Exclusive merchandise celebrating the NEAR Protocol community",
      buttonText: "Shop Collections",
    },
    {
      badge: "Limited Edition",
      title: "NEAR FOUNDATION",
      subtitle: "ESSENTIALS",
      description:
        "Premium quality gear designed for builders and innovators of the decentralized web",
      buttonText: "Explore Now",
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
      <section className="relative bg-gradient-to-b from-[#012216] to-[#00ec97] overflow-hidden">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8 md:py-20 lg:py-24">
          <div
            className="relative overflow-visible"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {slides.map((slide, index) => (
              <div
                key={index}
                className={`w-full grid lg:grid-cols-2 gap-8 items-center ${
                  index === currentSlide ? "block" : "hidden"
                }`}
              >
                {/* Text Section with reveal animation */}
                <div className="text-white space-y-6 z-10 overflow-hidden">
                  <div
                    className={`inline-block bg-white/10 backdrop-blur-sm px-4 py-2 text-sm text-white/80 mb-4 uppercase font-bold transition-all duration-700 ease-out ${
                      !isAnimating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    }`}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.34, 1.56, 0.64, 1)",
                    }}
                  >
                    {slide.badge}
                  </div>
                  <h1
                    className={`text-4xl md:text-5xl lg:text-7xl font-bold transition-all duration-800 ease-out ${
                      !isAnimating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    }`}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "0.1s",
                    }}
                  >
                    {slide.title}
                    <br />
                    <span className="text-3xl md:text-5xl lg:text-6xl">
                      {slide.subtitle}
                    </span>
                  </h1>
                  <p
                    className={`text-lg md:text-xl text-white/80 my-8 transition-all duration-800 ease-out ${
                      !isAnimating
                        ? "translate-y-0 opacity-100"
                        : "-translate-y-full opacity-0"
                    }`}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "0.2s",
                    }}
                  >
                    {slide.description}
                  </p>
                  <div
                    className={`flex flex-wrap gap-4 transition-all duration-800 ease-out ${
                      !isAnimating
                        ? "translate-y-0 opacity-100"
                        : "translate-y-full opacity-0"
                    }`}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      transitionDelay: "0.3s",
                    }}
                  ></div>
                </div>

                {/* Image Section with zoom animation */}
                <div className="hidden lg:block relative h-full min-h-[500px]">
                  <div className="relative w-full h-full flex items-end justify-end overflow-hidden">
                    {/* Large glowing orb with fill animation */}
                    <div
                      className={`absolute top-0 right-1/3 -translate-y-1/4 rounded-full bg-[#00ec97] blur-[120px] transition-all duration-800 ease-out ${
                        !isAnimating
                          ? "w-[500px] h-[500px] opacity-30"
                          : "w-0 h-0 opacity-0"
                      }`}
                      style={{
                        transitionTimingFunction:
                          "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />

                    {/* Main image with zoom animation */}
                    <div
                      className={`relative z-10 transition-all duration-800 ease-out ${
                        !isAnimating
                          ? "scale-100 opacity-100"
                          : "scale-75 opacity-0"
                      }`}
                      style={{
                        transitionTimingFunction:
                          "cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    >
                      <img
                        src={manOnNearImage}
                        alt="NEAR Protocol"
                        className="w-auto h-auto max-w-[90%] max-h-[600px] object-contain object-bottom-right"
                        style={{
                          filter:
                            "drop-shadow(0 35px 70px rgba(0, 0, 0, 0.4)) drop-shadow(0 0 80px rgba(0, 236, 151, 0.3)) contrast(1.1) brightness(1.05)",
                        }}
                      />
                    </div>

                    {/* Grid overlay for tech feel */}
                    <div
                      className="absolute inset-0 opacity-10"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
                        backgroundSize: "50px 50px",
                      }}
                    />

                    {/* Animated scan line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#00ec97] to-transparent animate-scan" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-end gap-3 mt-8 relative z-20">
            <button
              onClick={prevSlide}
              type="button"
              className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
              aria-label="Previous"
            >
              <ChevronLeft
                className="h-5 w-5 text-white group-hover:text-black transition-colors"
                aria-hidden="true"
              />
            </button>
            <button
              onClick={nextSlide}
              type="button"
              className="group flex items-center justify-center w-12 h-12 rounded-full border border-white/20 bg-black/20 backdrop-blur-md hover:bg-white hover:text-black hover:border-white transition-all duration-300 cursor-pointer"
              aria-label="Next"
            >
              <ChevronRight
                className="h-5 w-5 text-white group-hover:text-black transition-colors"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-20">
          <div className="absolute top-1/2 right-[10%] -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-[#00ec97] blur-[100px]" />
        </div>
      </section>

      {/* == Collections Section == */}
      {/* HIDDEN: Collections section on homepage - uncomment to restore */}
      {/* <section className=" ">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-12 md:py-20 lg:py-24">
          <div className="flex flex-col items-center mb-12 text-center">
            <h2 className="mb-4 font-bold text-3xl md:text-4xl tracking-tight">Shop by Collection</h2>
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
              ) as { products?: unknown[] } | undefined;
              const productCount = detailData?.products?.length ?? 0;

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
                      alt={collection.name}
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

      <section className="py-16 md:py-20 border-t border-border" id="products">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16">
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
                  {isError && " The API may be temporarily unavailable."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={favoriteIds.includes(product.id)}
                  onToggleFavorite={toggleFavorite}
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
