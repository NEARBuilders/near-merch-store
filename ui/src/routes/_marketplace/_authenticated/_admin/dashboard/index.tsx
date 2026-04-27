import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useProducts } from "@/integrations/api";
import { useSyncProducts } from "@/integrations/api/admin";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { data: productsData } = useProducts({ limit: 100 });
  const products = productsData?.products || [];
  const { isSyncing, progress, startSync, cancelSync } = useSyncProducts();

  const stats = useMemo(() => {
    const totalProducts = products.length;
    const listedProducts = products.filter((p) => p.listed !== false).length;
    const totalVariants = products.reduce((acc, p) => acc + (p.variants?.length || 0), 0);
    const providers = new Set(products.map((p) => p.fulfillmentProvider)).size;
    const categories = new Set(
      products.flatMap((p) => (p.collections ?? []).map((c) => c.slug))
    ).size;

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

      {/* Sync Progress */}
      {isSyncing && progress && (
        <div className="rounded-2xl bg-background border border-border/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-foreground/90 dark:text-muted-foreground">
              Syncing from Printful
              {progress.currentProductName && ` — ${progress.currentProductName}`}
            </h3>
            <button
              onClick={cancelSync}
              className="text-xs text-foreground/60 hover:text-foreground/90 transition-colors"
            >
              Cancel
            </button>
          </div>
          {progress.total && progress.total > 0 && (
            <div className="w-full bg-border/30 rounded-full h-2 mb-2">
              <div
                className="bg-[#00EC97] h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${((progress.totalSynced + progress.totalUpdated + progress.totalFailed) / progress.total) * 100}%`,
                }}
              />
            </div>
          )}
          <p className="text-xs text-foreground/60">
            {progress.totalSynced} added, {progress.totalUpdated} updated, {progress.totalFailed} failed
            {progress.total ? ` of ${progress.total}` : ""}
            {progress.message ? ` — ${progress.message}` : ""}
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="rounded-2xl bg-background border border-border/60 p-4">
        <h3 className="text-sm font-medium text-foreground/90 dark:text-muted-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/dashboard/new-product"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00EC97] text-black font-semibold text-sm hover:bg-[#00d97f] transition-colors"
          >
            <Plus className="size-4" />
            Create Product
          </Link>
          <button
            onClick={() => startSync("printful")}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-foreground/10 text-foreground font-semibold text-sm hover:bg-foreground/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`size-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Printful Products"}
          </button>
        </div>
      </div>
    </div>
  );
}