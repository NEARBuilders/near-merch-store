import { Link, useMatchRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Search, Heart, ShoppingCart, User, Menu, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CartSidebar } from "@/components/marketplace/cart-sidebar";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { useCartSidebarStore } from "@/stores/cart-sidebar-store";
import { NearMark } from "@/components/near-mark";
import { NearWordmark } from "@/components/near-wordmark";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import nearLogo from "@/assets/images/pngs/logo_sq.png";
import { useCategories } from "@/integrations/api";

function CollectionsDropdown() {
  const matchRoute = useMatchRoute();
  const location = useLocation();

  const { data, isLoading } = useCategories();
  const categories = data?.categories ?? [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cursor-pointer text-sm font-semibold text-foreground hover:text-[#00EC97] transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg focus:outline-none focus:ring-0 border-0">
          Collections
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={20} className="w-56 bg-background/60 backdrop-blur-sm border border-border/60 rounded-2xl p-2 shadow-lg">
        <DropdownMenuItem asChild className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97]">
          <Link
            to="/collections"
            preload="intent"
            preloadDelay={0}
            className={`cursor-pointer rounded-lg px-3 py-2 hover:text-[#00EC97] focus:text-[#00EC97] transition-colors ${
              matchRoute({ to: "/collections" }) ? "text-[#00EC97]" : ""
            }`}
          >
            All Collections
          </Link>
        </DropdownMenuItem>

        {isLoading && (
          <div className="px-3 py-2 text-xs text-foreground/60 dark:text-muted-foreground">
            Loading collections…
          </div>
        )}

        {!isLoading && categories.length === 0 && (
          <div className="px-3 py-2 text-xs text-foreground/60 dark:text-muted-foreground">
            No collections yet.
          </div>
        )}

        {categories.map((cat) => {
          const isActive = matchRoute({ to: "/collections/$collection" }) && location.pathname === `/collections/${cat.slug}`;
          return (
            <DropdownMenuItem
              key={cat.slug}
              asChild
              className="focus:bg-transparent hover:bg-transparent focus:text-[#00EC97]"
            >
              <Link
                to="/collections/$collection"
                params={{ collection: cat.slug }}
                preload="intent"
                preloadDelay={0}
                className={`cursor-pointer rounded-lg px-3 py-2 hover:text-[#00EC97] focus:text-[#00EC97] transition-colors ${
                  isActive ? "text-[#00EC97]" : ""
                }`}
              >
                {cat.name}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MarketplaceHeader() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [connectedAccountId, setConnectedAccountId] = useState<string | null>(null);
  const isCartSidebarOpen = useCartSidebarStore((state) => state.isOpen);
  const closeCartSidebar = useCartSidebarStore((state) => state.close);
  const openCartSidebar = useCartSidebarStore((state) => state.open);

  const { totalCount: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();

  const { data: session, refetch: refetchSession } = authClient.useSession();
  const isLoggedIn = !!session?.user;

  // Close login modal when user becomes logged in
  useEffect(() => {
    if (isLoggedIn && isLoginOpen) {
      setIsLoginOpen(false);
      setLoginStep(1);
      setConnectedAccountId(null);
    }
  }, [isLoggedIn, isLoginOpen]);

  const matchRoute = useMatchRoute();
  const location = useLocation();
  const navigate = useNavigate();
  const currentCategoryId = (location.search as { categoryId?: string })?.categoryId || null;

  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories ?? [];

  const isProductsActive = !!matchRoute({ to: '/products' });
  const isExclusivesActive = !!matchRoute({ to: '/exclusives' });
  const isTrackOrderActive = !!matchRoute({ to: '/account/orders' });

  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    try {
      setIsLoginOpen(false);
      
      await authClient.requestSignIn.near(
        { recipient: window.__RUNTIME_CONFIG__?.account ?? "every.near" },
        {
          onSuccess: () => {
            const walletAccountId = authClient.near.getAccountId();
            setConnectedAccountId(walletAccountId);
            setLoginStep(2);
            setIsConnectingWallet(false);
            toast.success("Wallet connected! Now sign the message to complete login.");
            setIsLoginOpen(true);
          },
          onError: (error: any) => {
            setIsConnectingWallet(false);
            console.error("Wallet connection error:", error);
            setIsLoginOpen(true);
          },
        }
      );
    } catch (error) {
      setIsConnectingWallet(false);
      console.error("Wallet connection error:", error);
      setIsLoginOpen(true);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await authClient.signIn.near(
        { recipient: window.__RUNTIME_CONFIG__?.account ?? "every.near" },
        {
          onSuccess: async () => {
            // Wait for session to be saved
            await new Promise(resolve => setTimeout(resolve, 200));
            // Refetch session to update UI state
            await refetchSession();
            // Invalidate all queries to refresh UI state
            queryClient.invalidateQueries();
            setIsSigningIn(false);
            setIsLoginOpen(false);
            setLoginStep(1);
            setConnectedAccountId(null);
            // Stay on the same page after signing in; just close the dialog.
            // Route-guarded pages handle their own redirects via `redirect` search param.
          },
          onError: (error: any) => {
            setIsSigningIn(false);
            console.error("Sign in error:", error);
            
            if (error?.code === "NONCE_NOT_FOUND" || error?.message?.includes("nonce")) {
              toast.error("Session expired. Please reconnect your wallet.");
              handleDisconnect();
            } else {
              toast.error("Failed to sign in. Please try again.");
            }
          },
        }
      );
    } catch (error) {
      setIsSigningIn(false);
      console.error("Sign in error:", error);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleDisconnect = async () => {
    try {
      await authClient.near.disconnect();
    } catch (error) {
      console.error("Disconnect error:", error);
    }
    setConnectedAccountId(null);
    setLoginStep(1);
  };

  const isWalletConnected = loginStep === 2;

  const handleCreateWallet = () => {
    const width = 500;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    window.open(
      'https://wallet.meteorwallet.app/connect/mainnet/login?connectionUid=8Lt_7EFCO9g84frjAdAxw&',
      'Meteor Wallet',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate({ to: '/search', search: { q: searchQuery } });
    }
  };

  return (
    <>
      {/* Mobile menu backdrop - darken background when menu is open */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

    <header className="absolute top-4 md:top-6 left-0 right-0 z-50 w-full border-0 shadow-none bg-transparent">
      {/* Navigation bar container */}
      <nav className="relative container-app mx-auto px-4 md:px-8 lg:px-16 py-2 border-0 bg-transparent">
        <div className="flex items-center justify-between h-14 md:h-16 rounded-2xl bg-background/60 backdrop-blur-sm px-6 md:px-8 border border-border/60 shadow-none">
          {/* Logo */}
          <Link
            to="/"
            aria-label="NEAR"
            className="text-xl font-bold flex flex-row items-center gap-2 md:gap-4 shrink-0 text-foreground hover:opacity-80 transition-opacity"
          >
            <NearMark className="max-w-[28px]" />
            <span aria-hidden="true" className="h-6 w-px bg-border/60" />
            <NearWordmark className="max-w-[70px]" />
          </Link>

          <nav className="hidden lg:flex items-center gap-2">
            <Link
              to="/products"
              search={{ category: "all", categoryId: undefined, collection: undefined }}
              preload="intent"
              preloadDelay={0}
              className={`text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg ${
                isProductsActive && !currentCategoryId ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
              }`}
            >
              Shop Merch
            </Link>
            
            <CollectionsDropdown />
            
            <Link
            to="/exclusives"
            preload="intent"
            preloadDelay={0}
              className={`text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg ${
                isExclusivesActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
              }`}
            >
              Exclusives
            </Link>
            
            <Link
              to="/account/orders"
              preload="intent"
              preloadDelay={0}
              className={`text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg ${
                isTrackOrderActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
              }`}
            >
              Track Order
            </Link>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2">
              {isSearchOpen && (
                <form onSubmit={handleSearch} className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="search"
                      placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-3 h-9 w-52 bg-background/60 border border-border/30 rounded-lg text-sm text-foreground shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/30"
                      autoFocus
                />
              </div>
            </form>
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="cursor-pointer relative hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                onClick={() => setIsSearchOpen((prev) => !prev)}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>

            <Link to="/favorites" className="hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer relative hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
              >
                <Heart className="h-5 w-5" />
                {favoritesCount > 0 && (
                  <span className="badge-count">
                    {favoritesCount}
                  </span>
                )}
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              onClick={openCartSidebar}
              className="cursor-pointer relative hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
            >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="badge-count">
                    {cartCount}
                  </span>
                )}
              </Button>

            <Link to="/favorites" className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                className="cursor-pointer relative hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
              >
                <Heart className="h-5 w-5" />
                {favoritesCount > 0 && (
                  <span className="badge-count">
                    {favoritesCount}
                  </span>
                )}
              </Button>
            </Link>

            <div className="md:hidden">
              {isLoggedIn ? (
            <Link to="/account">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                  >
                <User className="h-5 w-5" />
              </Button>
            </Link>
              ) : (
<Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                      >
                      <User className="h-5 w-5" />
                    </Button>
                  </DialogTrigger>
                <DialogContent 
                  showCloseButton={false}
                  className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-0"
                >
                  <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sign In</h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                        onClick={() => setIsLoginOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      <p className="text-xs sm:text-sm text-foreground/90 dark:text-muted-foreground">
                        {!isWalletConnected 
                          ? "Connect your NEAR wallet to continue"
                          : "Sign the message to complete authentication"}
                      </p>
                      {!isWalletConnected && (
                        <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground leading-relaxed">
                          Don't have a NEAR wallet?{" "}
                          <button
                            onClick={handleCreateWallet}
                            className="underline hover:text-[#00EC97] cursor-pointer transition-colors"
                          >
                            Create one here
                          </button>
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 sm:space-y-4">
                      {!isWalletConnected ? (
                        <button
                          onClick={handleConnectWallet}
                          disabled={isConnectingWallet}
                          className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                        >
                          <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                            <img
                              src={nearLogo}
                              alt="NEAR"
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-contain invert dark:invert-0"
                            />
                          </div>
                          <span>
                            {isConnectingWallet ? "Connecting..." : "Connect NEAR Wallet"}
                          </span>
                        </button>
                      ) : (
                        <>
                          <div className="bg-muted/50 border border-border/60 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                            <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground mb-1">Connected wallet</p>
                            <p className="text-xs sm:text-sm font-medium truncate">{connectedAccountId}</p>
                          </div>
                          
<button
                          onClick={handleSignIn}
                          disabled={isSigningIn}
                          className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                        >
                          <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                            <img
                              src={nearLogo}
                              alt="NEAR"
                              loading="eager"
                              decoding="async"
                              className="w-full h-full object-contain invert dark:invert-0"
                            />
                            </div>
                            <span>
                              {isSigningIn ? "Signing in..." : "Sign Message & Continue"}
                            </span>
                          </button>

                          <button
                            onClick={handleDisconnect}
                            disabled={isSigningIn}
                            className="w-full text-muted-foreground px-3 sm:px-4 py-2 flex items-center justify-center hover:text-[#00EC97] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <span className="text-[10px] sm:text-xs underline">Use a different wallet</span>
                          </button>
                        </>
                      )}
                    </div>

                    <div className="text-center text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground">
                      {!isWalletConnected ? (
                        <p>Step 1 of 2</p>
                      ) : (
                        <p>Step 2 of 2 · Free, no transaction required</p>
                      )}
                    </div>
                  </div>
                </DialogContent>
                </Dialog>
                )}
            </div>

            <div className="hidden md:block">
              {isLoggedIn ? (
            <Link to="/account">
                  <Button
                    variant="ghost"
                    size="icon"
                      className="cursor-pointer hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                    >
                      <User className="h-5 w-5" />
                    </Button>
                  </Link>
                ) : (
                  <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="cursor-pointer hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                      >
                        <User className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                  <DialogContent 
                    showCloseButton={false}
                    className="rounded-2xl bg-background/60 backdrop-blur-sm border border-border/60 p-0"
                  >
                    <div className="p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Sign In</h2>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97]"
                          onClick={() => setIsLoginOpen(false)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <p className="text-xs sm:text-sm text-foreground/90 dark:text-muted-foreground">
                          {!isWalletConnected 
                            ? "Connect your NEAR wallet to continue"
                            : "Sign the message to complete authentication"}
                        </p>
                        {!isWalletConnected && (
                          <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground leading-relaxed">
                            Don't have a NEAR wallet?{" "}
                            <button
                              onClick={handleCreateWallet}
                              className="underline hover:text-[#00EC97] cursor-pointer transition-colors"
                            >
                              Create one here
                            </button>
                          </p>
                        )}
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        {!isWalletConnected ? (
                          <button
                            onClick={handleConnectWallet}
                            disabled={isConnectingWallet}
                            className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                          >
                            <div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                              <img
                                src={nearLogo}
                                alt="NEAR"
                                loading="eager"
                                decoding="async"
                                className="w-full h-full object-contain invert dark:invert-0"
                              />
                            </div>
                            <span>
                              {isConnectingWallet ? "Connecting..." : "Connect NEAR Wallet"}
                            </span>
                          </button>
                        ) : (
                          <>
                            <div className="bg-muted/50 border border-border/60 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3">
                              <p className="text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground mb-1">Connected wallet</p>
                              <p className="text-xs sm:text-sm font-medium truncate">{connectedAccountId}</p>
                            </div>

                            <button
                              onClick={handleSignIn}
                              disabled={isSigningIn}
                              className="w-full bg-[#00EC97] text-black px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center justify-center gap-2 sm:gap-3 hover:bg-[#00d97f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
                            >
<div className="size-4 sm:size-5 overflow-hidden flex items-center justify-center">
                              <img
                                src={nearLogo}
                                alt="NEAR"
                                loading="eager"
                                decoding="async"
                                className="w-full h-full object-contain invert dark:invert-0"
                              />
                              </div>
                              <span>
                                {isSigningIn ? "Signing in..." : "Sign Message & Continue"}
                              </span>
                            </button>

                            <button
                              onClick={handleDisconnect}
                              disabled={isSigningIn}
                              className="w-full text-muted-foreground px-3 sm:px-4 py-2 flex items-center justify-center hover:text-[#00EC97] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-[10px] sm:text-xs underline">Use a different wallet</span>
                            </button>
                          </>
                        )}
                      </div>

                      <div className="text-center text-[10px] sm:text-xs text-foreground/90 dark:text-muted-foreground">
                        {!isWalletConnected ? (
                          <p>Step 1 of 2</p>
                        ) : (
                          <p>Step 2 of 2 · Free, no transaction required</p>
                        )}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="md:hidden hover:bg-transparent hover:!bg-transparent focus-visible:!bg-transparent hover:text-[#00EC97] relative z-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMobileMenuOpen((open) => !open);
              }}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                  <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 relative z-[60] space-y-3">
            <div className="rounded-2xl bg-background/80 backdrop-blur-sm border border-border/60 px-6 md:px-8 py-4">
              <form
                onSubmit={(e) => {
                    handleSearch(e);
                    setMobileMenuOpen(false);
                }}
                className="mb-3"
              >
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-background/70 border border-border/60 rounded-md text-sm focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-b-2 focus-visible:border-[#00EC97] hover:border-border/60"
                      />
                    </div>
                  </form>
              <p className="text-foreground/90 dark:text-muted-foreground text-xs">
                Browse our products and discover the latest NEAR merch drops.
              </p>
            </div>

            <div className="rounded-2xl bg-background/80 backdrop-blur-sm border border-border/60 px-6 py-4 space-y-2">
              <Link
                to="/products"
                search={{ category: "all", categoryId: undefined, collection: undefined }}
                preload="intent"
                preloadDelay={0}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                  isProductsActive && !currentCategoryId ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                }`}
              >
                Shop Merch
              </Link>
              
              <div className="space-y-1">
                <Link
                  to="/collections"
                  preload="intent"
                  preloadDelay={0}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                    matchRoute({ to: "/collections" }) && !matchRoute({ to: "/collections/$collection" }) ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                  }`}
                >
                  Collections
                </Link>
                {categories.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-foreground/60 dark:text-muted-foreground">
                    No collections yet.
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isActive = matchRoute({ to: "/collections/$collection" }) && location.pathname === `/collections/${cat.slug}`;
                    return (
                      <Link
                        key={cat.slug}
                        to="/collections/$collection"
                        params={{ collection: cat.slug }}
                        preload="intent"
                        preloadDelay={0}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`block pl-6 pr-3 py-2 text-sm transition-colors rounded-lg ${
                          isActive ? 'text-[#00EC97]' : 'text-foreground/90 hover:text-[#00EC97]'
                        }`}
                      >
                        {cat.name}
                      </Link>
                    );
                  })
                )}
              </div>
              
              <Link
                to="/exclusives"

                preload="intent"
                preloadDelay={0}
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                  isExclusivesActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                }`}
              >
                Exclusives
              </Link>
              
<Link
                    to="/account/orders"
                    preload="intent"
                    preloadDelay={0}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block text-sm font-semibold transition-colors px-3 py-2 rounded-lg ${
                      isTrackOrderActive ? 'text-[#00EC97]' : 'text-foreground hover:text-[#00EC97]'
                    }`}
                  >
                    Track Order
                  </Link>
            </div>
          </div>
        )}
          </nav>
        </header>

    <CartSidebar
      isOpen={isCartSidebarOpen}
      onClose={closeCartSidebar}
    />
    </>
  );
}
