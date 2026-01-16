import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { MarketplaceFooter } from "@/components/marketplace-footer";

export const Route = createFileRoute("/_marketplace")({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  return (
    <div className="min-h-screen w-full relative">
      <MarketplaceHeader />

      <main className="border-0 relative">
        {/* Gradient overlay from bottom (dark) to top (lighter) */}
        <div className="fixed inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-0 pointer-events-none" style={{ height: '100vh' }}></div>
        
        <div className="relative z-10">
        <Outlet />
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
