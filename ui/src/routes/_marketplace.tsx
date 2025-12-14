import { createFileRoute, Outlet } from "@tanstack/react-router";
import { MarketplaceHeader } from "@/components/marketplace-header";
import { MarketplaceFooter } from "@/components/marketplace-footer";

export const Route = createFileRoute("/_marketplace")({
  component: MarketplaceLayout,
});

function MarketplaceLayout() {
  return (
    <div className="bg-background min-h-screen w-full font-['Red_Hat_Mono',monospace]">
      <MarketplaceHeader />

      <main>
        <Outlet />
      </main>

      <MarketplaceFooter />
    </div>
  );
}
