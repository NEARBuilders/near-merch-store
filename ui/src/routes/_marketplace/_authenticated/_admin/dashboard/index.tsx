import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useProducts, useSyncStatus } from "@/integrations/api";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { data: productsData } = useProducts({ limit: 100 });
  const products = productsData?.products || [];
  const { data: syncStatusData } = useSyncStatus();

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const listedProducts = products.filter((p) => p.listed !== false).length;
    const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
    const providers = new Set(products.map((p) => p.fulfillmentProvider)).size;
    const categories = new Set(products.map((p) => p.category)).size;

    return { totalProducts, listedProducts, totalVariants, providers, categories };
  }, [products]);

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight mb-1 md:mb-2">Overview</h2>
        <p className="text-xs md:text-sm text-foreground/70 dark:text-muted-foreground">
          Dashboard statistics and quick insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4">
          <p className="text-foreground/70 dark:text-muted-foreground text-xs md:text-sm mb-1">Total Products</p>
          <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">{stats.totalProducts}</p>
        </div>
        <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4">
          <p className="text-foreground/70 dark:text-muted-foreground text-xs md:text-sm mb-1">Listed</p>
          <p className="text-xl md:text-2xl font-semibold text-[#00EC97]">{stats.listedProducts}</p>
        </div>
        <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4">
          <p className="text-foreground/70 dark:text-muted-foreground text-xs md:text-sm mb-1">Total Variants</p>
          <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">{stats.totalVariants}</p>
        </div>
        <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4">
          <p className="text-foreground/70 dark:text-muted-foreground text-xs md:text-sm mb-1">Providers</p>
          <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">{stats.providers}</p>
        </div>
        <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4 col-span-2 sm:col-span-1">
          <p className="text-foreground/70 dark:text-muted-foreground text-xs md:text-sm mb-1">Categories</p>
          <p className="text-xl md:text-2xl font-semibold text-foreground/90 dark:text-muted-foreground">{stats.categories}</p>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatusData && syncStatusData.lastSuccessAt && (
        <div className="rounded-lg bg-[#00EC97]/10 border border-[#00EC97]/30 p-3 md:p-4 text-xs md:text-sm text-[#00EC97]">
          Last product sync: {new Date(syncStatusData.lastSuccessAt).toLocaleString()}
        </div>
      )}

      {/* Welcome Message */}
      <div className="rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 p-3 md:p-4">
        <p className="text-xs md:text-sm text-foreground/90 dark:text-muted-foreground">
          Welcome to the admin dashboard. Use the sidebar to manage inventory, orders, and users.
        </p>
      </div>
    </div>
  );
}
