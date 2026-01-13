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
      <h2 className="text-lg font-medium">Overview</h2>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-card border border-border p-4">
          <p className="text-[#717182] text-sm mb-1">Total Products</p>
          <p className="text-2xl font-medium">{stats.totalProducts}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-[#717182] text-sm mb-1">Listed</p>
          <p className="text-2xl font-medium text-[#00ec97]">{stats.listedProducts}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-[#717182] text-sm mb-1">Total Variants</p>
          <p className="text-2xl font-medium">{stats.totalVariants}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-[#717182] text-sm mb-1">Providers</p>
          <p className="text-2xl font-medium">{stats.providers}</p>
        </div>
        <div className="bg-card border border-border p-4">
          <p className="text-[#717182] text-sm mb-1">Categories</p>
          <p className="text-2xl font-medium">{stats.categories}</p>
        </div>
      </div>

      {syncStatusData && syncStatusData.lastSuccessAt && (
        <div className="bg-[#00ec97]/10 p-4 text-sm text-[#00ec97]">
          Last product sync: {new Date(syncStatusData.lastSuccessAt).toLocaleString()}
        </div>
      )}

      <div className="bg-[#ececf0] dark:bg-muted p-4">
        <p className="text-sm text-[#717182]">
          Welcome to the admin dashboard. Use the sidebar to manage inventory, orders, and users.
        </p>
      </div>
    </div>
  );
}
