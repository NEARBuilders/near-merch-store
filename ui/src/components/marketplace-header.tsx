import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Heart, ShoppingCart, User, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { useCart } from "@/hooks/use-cart";
import { useFavorites } from "@/hooks/use-favorites";
import { ThemeToggle } from "@/components/theme-toggle";
import { NearMark } from "@/components/near-mark";
import { NearWordmark } from "@/components/near-wordmark";

export function MarketplaceHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { totalCount: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50">
      <div className="container-app py-3 md:py-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="NEAR"
            className="text-xl font-bold flex flex-row items-center gap-2 md:gap-4 relative pl-0 pr-0 py-0 md:pl-[26px] md:pr-6 md:py-4 shrink-0 grow-0 text-foreground"
          >
            <NearMark className="max-w-[28px]" />
            <span aria-hidden="true" className="h-6 w-px bg-border/60" />
            <NearWordmark className="max-w-[70px]" />
          </Link>

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
                  className="pl-12 py-5 bg-muted border-none rounded-none text-base text-foreground font-medium"
                />
              </div>
            </form>

            <Link to="/favorites">
              <Button variant="ghost" size="icon" className="relative">
                <Heart className="h-5 w-5" />
                {favoritesCount > 0 && (
                  <span className="badge-count">
                    {favoritesCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="badge-count">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>

            <Link to="/account">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </Link>

            <div className="hidden md:block">
              <ThemeToggle />
            </div>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden -mr-2">
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
