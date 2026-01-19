import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { MarketplaceFooter } from "@/components/marketplace-footer";

export const Route = createFileRoute("/_marketplace")({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  const routerState = useRouterState();
  const isPending = routerState.isLoading;

  return (
    <div className="min-h-screen w-full relative bg-background">
      <MarketplaceHeader />

      <main className="border-0 relative bg-background">
        <div className={`relative z-10 transition-opacity duration-300 ${isPending ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <Outlet />
        </div>
      </main>

      <MarketplaceFooter />
    </div>
  );
}
