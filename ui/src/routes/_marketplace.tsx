import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/hooks/use-cart';
import { useFavorites } from '@/hooks/use-favorites';
import { COLLECTIONS } from '@/integrations/marketplace-api';
import { authClient } from '@/lib/auth-client';

export const Route = createFileRoute('/_marketplace')({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  const [searchQuery, setSearchQuery] = useState('');
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

  return (
    <div className="bg-white min-h-screen w-full font-['Red_Hat_Mono',monospace]">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-[rgba(0,0,0,0.1)]">
        <nav className="max-w-[1408px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#00ec97] rounded-full" />
            <span className="font-semibold text-lg hidden sm:inline">NEAR Store</span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-black">
                  Collections <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {COLLECTIONS.map((c) => (
                  <DropdownMenuItem key={c} asChild>
                    <Link to={`/collections/${c.toLowerCase()}`}>
                      {c}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem asChild>
                  <Link to="/collections">View All</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717182]" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-[#f3f3f5] border-none"
              />
            </div>
          </form>

          <div className="flex items-center gap-2">
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
              <Button variant="ghost" size="icon" disabled>
                <User className="h-5 w-5" />
              </Button>
            ) : session ? (
              <Link to="/account">
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button variant="ghost" className="text-sm">
                  Login
                </Button>
              </Link>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col gap-6 mt-8">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#717182]" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-[#f3f3f5] border-none"
                      />
                    </div>
                  </form>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-[#717182] uppercase tracking-wider">
                      Collections
                    </h3>
                    {COLLECTIONS.map((c) => (
                      <Link
                        key={c}
                        to={`/collections/${c.toLowerCase()}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-lg hover:text-[#00ec97] transition-colors"
                      >
                        {c}
                      </Link>
                    ))}
                    <Link
                      to="/collections"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-lg hover:text-[#00ec97] transition-colors"
                    >
                      View All Collections
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="bg-neutral-950 text-white py-16">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#00ec97] rounded-full" />
                <span className="font-semibold text-lg">NEAR Store</span>
              </div>
              <p className="text-white/60 text-sm">
                Official merchandise for the NEAR Protocol community.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Shop</h4>
              <div className="space-y-2">
                {COLLECTIONS.map((c) => (
                  <Link
                    key={c}
                    to={`/collections/${c.toLowerCase()}`}
                    className="block text-white/60 hover:text-[#00ec97] transition-colors text-sm"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  Contact Us
                </a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  Shipping Info
                </a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  Returns
                </a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  FAQ
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="space-y-2">
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  Twitter
                </a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  Discord
                </a>
                <a href="#" className="block text-white/60 hover:text-white transition-colors text-sm">
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mt-12 pt-8 text-center text-white/40 text-sm">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
