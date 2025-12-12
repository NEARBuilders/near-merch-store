import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Heart, ShoppingBag, User, Menu, X, LogIn } from "lucide-react";
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
import { COLLECTIONS } from "@/integrations/marketplace-api";
import { authClient } from "@/lib/auth-client";
import logoFull from "@/assets/logo_full.png";

export function MarketplaceHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { totalCount: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { data: session, isPending } = authClient.useSession();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const collections = [
    {
      name: "Men",
      href: "/collections/men",
    },
    {
      name: "Women",
      href: "/collections/women",
    },
    {
      name: "Collections",
      href: "/collections",
    },
  ];

  return (
    <header className="bg-white border-b border-[rgba(0,0,0,0.1)] sticky top-0 z-50">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-4">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img
              src={logoFull}
              alt="NEAR Store"
              className="h-5 md:h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {collections.map((collection) => (
              <Link
                key={collection.name}
                to={collection.href}
                className="text-[16px] text-black font-bold hover:text-neutral-600 transition-colors"
              >
                {collection.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <form
              onSubmit={handleSearch}
              className="flex-1 max-w-[400px] hidden lg:flex"
            >
              <div className="relative w-full max-w-[260px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717182]" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-5 bg-[#f3f3f5] border-none rounded-none text-[16px] text-black font-medium"
                />
              </div>
            </form>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>

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
                <ShoppingBag className="h-5 w-5" />
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

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80" hideCloseButton>
                <div className="flex flex-col gap-6 mt-8 px-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm text-[#717182] uppercase tracking-wider">
                      Collections
                    </h3>
                    <SheetClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                      </Button>
                    </SheetClose>
                  </div>
                  <div className="space-y-4">
                    {collections.map((collection) => (
                      <Link
                        key={collection.name}
                        to={collection.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-lg text-black hover:text-[#00ec97] transition-colors"
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
                        className="block py-2 text-lg text-black hover:text-[#00ec97] transition-colors"
                      >
                        {c}
                      </Link>
                    ))}
                    <Link
                      to="/collections"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-lg text-black hover:text-[#00ec97] transition-colors"
                    >
                      View All Collections
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="mt-4 lg:hidden">
            <form onSubmit={handleSearch}>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717182]" />
                <Input
                  type="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 py-5 bg-[#f3f3f5] border-none rounded-none text-[16px] text-black font-medium w-full"
                />
              </div>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
