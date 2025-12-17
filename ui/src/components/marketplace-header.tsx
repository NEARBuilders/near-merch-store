import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Heart, ShoppingCart, User, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
// import { COLLECTIONS } from "@/integrations/marketplace-api"; // HIDDEN: Collections feature
import { authClient } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { NearMark } from "@/components/near-mark";
import { NearWordmark } from "@/components/near-wordmark";

export function MarketplaceHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { totalCount: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { data: session, isPending } = authClient.useSession();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  // HIDDEN: Collections feature - uncomment to restore
  // const collections = [
  //   {
  //     name: "Men",
  //     href: "/collections/men",
  //   },
  //   {
  //     name: "Women",
  //     href: "/collections/women",
  //   },
  //   {
  //     name: "Collections",
  //     href: "/collections",
  //   },
  // ];
  // const collections: Array<{ name: string; href: string }> = []; // HIDDEN: Unused variable

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
        <div className="flex items-center justify-between gap-4">
          <a
            href="/"
            aria-label="NEAR"
            className="text-xl font-bold flex flex-row items-center gap-4 relative pl-[26px] pr-6 py-4 shrink-0 grow-0 text-foreground"
          >
            <NearMark className="max-w-[28px]" />
            <span aria-hidden="true" className="h-6 w-px bg-border/60" />
            <NearWordmark className="max-w-[70px]" />
          </a>

          {/* HIDDEN: Collections navigation - uncomment to restore */}
          {/* <nav className="hidden md:flex items-center gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.name}
                to={collection.href}
                className="text-[16px] text-foreground font-bold hover:text-muted-foreground transition-colors"
              >
                {collection.name}
              </Link>
            ))}
          </nav> */}

          <div className="flex items-center gap-2 shrink-0">
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-[400px] hidden lg:flex"
            >
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-5 bg-muted border-none rounded-none text-[16px] text-foreground font-medium"
                />
              </div>
            </form>



            <Link to="/favorites">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00ec97] text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {favoritesCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#00ec97] text-black text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            {isPending ? (
              <Button
                variant="ghost"
                size="icon"
                disabled
                className="rounded-none"
              >
                <User className="h-5 w-5" />
              </Button>
            ) : session ? (
              <Link to="/account">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-none">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-none ">
                  <DropdownMenuItem asChild className="rounded-none">
                    <Link
                      to="/login"
                      className="flex items-center justify-between w-full cursor-pointer px-4 py-2 "
                    >
                      <LogIn className="h-4 w-4 font-extrabold" />
                      <span>Sign In</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[350px] flex flex-col" hideCloseButton>
                <div className="flex items-center justify-between px-4 mt-6 mb-6">
                  <ThemeToggle />
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-muted rounded-full">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>

                <div className="px-4 mb-6">
                  <form onSubmit={(e) => {
                    handleSearch(e);
                    setMobileMenuOpen(false);
                  }}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-10 bg-muted border-transparent focus:border-primary rounded-md text-sm"
                      />
                    </div>
                  </form>
                </div>

                <div className="flex-1 overflow-y-auto px-4">
                  {/* HIDDEN: Collections mobile menu - uncomment to restore */}
                  {/* <div className="space-y-1">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider mb-3 px-2">
                      Collections
                    </h3>
                    {collections.map((collection) => (
                      <Link
                        key={collection.name}
                        to={collection.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2.5 px-2 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        {collection.name}
                      </Link>
                    ))}
                    {COLLECTIONS.filter(
                      (c) => !collections.some((col) => col.name === c)
                    ).map((c: string) => (
                      <Link
                        key={c}
                        to="/collections/$collection"
                        params={{ collection: c.toLowerCase() }}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2.5 px-2 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                      >
                        {c}
                      </Link>
                    ))}
                    <Link
                      to="/collections"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2.5 px-2 text-base font-medium text-foreground hover:bg-muted rounded-md transition-colors"
                    >
                      View All Collections
                    </Link>
                  </div> */}
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-sm">Browse our products</p>
                  </div>
                </div>


              </SheetContent>
            </Sheet>
          </div>
        </div>


      </div>
    </header>
  );
}
