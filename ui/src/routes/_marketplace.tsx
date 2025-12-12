import { createFileRoute, Outlet, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Heart,
  ShoppingBag,
  User,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ModeToggle } from '@/components/mode-toggle';
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
import { apiClient } from '@/utils/orpc';

export const Route = createFileRoute('/_marketplace')({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalCount: cartCount } = useCart();
  const { count: favoritesCount } = useFavorites();
  const { data: session, isPending } = authClient.useSession();

  const { isError: isApiOffline } = useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      try {
        await apiClient.getCollections();
        return { status: 'online' };
      } catch (error) {
        throw error;
      }
    },
    refetchInterval: 30000,
    retry: false,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="bg-background min-h-screen w-full font-['Red_Hat_Mono',monospace]">
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-sm border-b border-border">
        <nav className="max-w-[1408px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-[#00ec97] rounded-full" />
            <span className="font-semibold text-lg hidden sm:inline">NEAR Store</span>
            <div
              className="relative group"
              title={isApiOffline ? 'API Disconnected' : 'API Connected'}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${isApiOffline ? 'bg-red-500' : 'bg-green-500'
                  }`}
              />
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-1 text-foreground">
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted border-none"
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

            <ModeToggle />

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[80%] sm:w-80 h-full flex flex-col p-0 border-l border-border/40 bg-background/80 backdrop-blur-2xl transition-all duration-300">
                <div className="flex-1 overflow-y-auto py-8 px-6">
                  <form onSubmit={handleSearch} className="mb-8">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 h-11 bg-muted/50 border-transparent focus:bg-background transition-all"
                      />
                    </div>
                  </form>

                  <div className="space-y-1">
                    <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Collections
                    </h3>
                    {COLLECTIONS.map((c) => (
                      <Link
                        key={c}
                        to={`/collections/${c.toLowerCase()}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors group"
                      >
                        <span className="text-base font-medium">{c}</span>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                    <Link
                      to="/collections"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-muted active:bg-muted transition-colors group mt-2"
                    >
                      <span className="text-base font-medium text-primary">View All Collections</span>
                      <ChevronRight className="w-5 h-5 text-primary transition-colors" />
                    </Link>
                  </div>
                </div>

                <div className="p-6 border-t border-border bg-muted/30">
                  <div className="grid grid-cols-3 gap-3">
                    <Link
                      to="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-muted/50 transition-colors gap-2"
                    >
                      <User className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] font-medium uppercase tracking-wide">Account</span>
                    </Link>
                    <Link
                      to="/cart"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-muted/50 transition-colors gap-2 relative"
                    >
                      <div className="relative">
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">
                            {cartCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wide">Cart</span>
                    </Link>
                    <Link
                      to="/favorites"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-muted/50 transition-colors gap-2 relative"
                    >
                      <div className="relative">
                        <Heart className="w-5 h-5 text-muted-foreground" />
                        {favoritesCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] rounded-full w-3 h-3 flex items-center justify-center font-bold">
                            {favoritesCount}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] font-medium uppercase tracking-wide">Saved</span>
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

      <footer className="bg-muted text-foreground py-16">
        <div className="max-w-[1408px] mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#00ec97] rounded-full" />
                <span className="font-semibold text-lg">NEAR Store</span>
              </div>
              <p className="text-muted-foreground text-sm">
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
                    className="block text-muted-foreground hover:text-primary transition-colors text-sm"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Contact Us
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Shipping Info
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Returns
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  FAQ
                </a>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <div className="space-y-2">
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Twitter
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  Discord
                </a>
                <a href="#" className="block text-muted-foreground hover:text-foreground transition-colors text-sm">
                  GitHub
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center text-muted-foreground/60 text-sm">
            © {new Date().getFullYear()} NEAR Protocol. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
