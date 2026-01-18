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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Overview</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
          Dashboard statistics and quick insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        <div className="rounded-2xl bg-background border border-border/60 p-4">
          <p className="text-foreground/90 dark:text-muted-foreground text-sm mb-1">Total Products</p>
          <p className="text-2xl font-semibold text-foreground">{stats.totalProducts}</p>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 p-4">
          <p className="text-foreground/90 dark:text-muted-foreground text-sm mb-1">Listed</p>
          <p className="text-2xl font-semibold text-[#00EC97]">{stats.listedProducts}</p>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 p-4">
          <p className="text-foreground/90 dark:text-muted-foreground text-sm mb-1">Total Variants</p>
          <p className="text-2xl font-semibold text-foreground">{stats.totalVariants}</p>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 p-4">
          <p className="text-foreground/90 dark:text-muted-foreground text-sm mb-1">Providers</p>
          <p className="text-2xl font-semibold text-foreground">{stats.providers}</p>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 p-4 col-span-2 sm:col-span-1">
          <p className="text-foreground/90 dark:text-muted-foreground text-sm mb-1">Categories</p>
          <p className="text-2xl font-semibold text-foreground">{stats.categories}</p>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatusData && syncStatusData.lastSuccessAt && (
        <div className="rounded-2xl bg-background border border-[#00EC97]/60 p-4 text-sm text-[#00EC97]">
          Last product sync: {new Date(syncStatusData.lastSuccessAt).toLocaleString()}
        </div>
      )}

      {/* Welcome Message */}
      <div className="rounded-2xl bg-background border border-border/60 p-4">
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
          Welcome to the admin dashboard. Use the sidebar to manage inventory, orders, and users.
        </p>
      </div>
    </div>
  );
}
