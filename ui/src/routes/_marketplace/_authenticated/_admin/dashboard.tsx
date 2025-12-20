import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  EyeOff,
  RefreshCw,
  LayoutDashboard,
  Users,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts, useSyncStatus, useSyncProducts, useUpdateProductListing, type Product } from "@/integrations/api";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard")({
  component: AdminDashboard,
});

type AdminSection = "dashboard" | "inventory" | "users" | "orders";

function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSection>("inventory");
  const { data: session } = authClient.useSession();

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-[1408px] mx-auto px-4 md:px-8 lg:px-16 py-8">
        <Link to="/" className="text-sm hover:underline mb-8 inline-block">
          ← Back to Store
        </Link>

        <div className="flex items-start justify-between mb-12">
          <div>
            <h1 className="text-2xl font-medium mb-2">Admin Dashboard</h1>
            <div className="flex items-center gap-2 text-[#717182] text-sm">
              <Badge variant="outline" className="bg-[#00ec97]/10 text-[#00ec97] border-[#00ec97]">
                Admin
              </Badge>
              <span>{session?.user?.email || "Admin User"}</span>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <div className="space-y-1">
            <button
              onClick={() => setActiveSection("dashboard")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                activeSection === "dashboard" ? "bg-[#ececf0]" : "hover:bg-[#f5f5f7]"
              )}
            >
              <LayoutDashboard className="size-4" />
              <span className="flex-1 text-sm">Overview</span>
            </button>

            <button
              onClick={() => setActiveSection("inventory")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                activeSection === "inventory" ? "bg-[#ececf0]" : "hover:bg-[#f5f5f7]"
              )}
            >
              <Package className="size-4" />
              <span className="flex-1 text-sm">Inventory</span>
            </button>

            <button
              onClick={() => setActiveSection("orders")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                activeSection === "orders" ? "bg-[#ececf0]" : "hover:bg-[#f5f5f7]"
              )}
            >
              <ShoppingBag className="size-4" />
              <span className="flex-1 text-sm">Orders</span>
            </button>

            <button
              onClick={() => setActiveSection("users")}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                activeSection === "users" ? "bg-[#ececf0]" : "hover:bg-[#f5f5f7]"
              )}
            >
              <Users className="size-4" />
              <span className="flex-1 text-sm">Users</span>
            </button>
          </div>

          {/* Main Content */}
          <div>
            {activeSection === "dashboard" && <DashboardOverview />}
            {activeSection === "inventory" && <InventoryManagement />}
            {activeSection === "orders" && <OrdersManagement />}
            {activeSection === "users" && <UsersManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}

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

      {/* Sync Status */}
      {syncStatusData && syncStatusData.lastSuccessAt && (
        <div className="bg-[#00ec97]/10 p-4 text-sm text-[#00ec97]">
          Last product sync: {new Date(syncStatusData.lastSuccessAt).toLocaleString()}
        </div>
      )}

      <div className="bg-[#ececf0] p-4">
        <p className="text-sm text-[#717182]">
          Welcome to the admin dashboard. Use the sidebar to manage inventory, orders, and users.
        </p>
      </div>
    </div>
  );
}

function InventoryManagement() {
  const { data: productsData, isLoading, refetch, isRefetching } = useProducts({ limit: 100, includeUnlisted: true });
  const products = productsData?.products || [];

  const { data: syncStatusData } = useSyncStatus();
  const syncMutation = useSyncProducts();
  const updateListingMutation = useUpdateProductListing();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleToggleListing = (productId: string, currentlyListed: boolean) => {
    updateListingMutation.mutate(
      { id: productId, listed: !currentlyListed },
      {
        onSuccess: () => {
          refetch();
        },
      }
    );
  };

  const isSyncing = syncStatusData?.status === "running" || syncMutation.isPending;

  const columns: ColumnDef<Product>[] = [
      {
        accessorKey: "thumbnailImage",
        header: "",
        cell: ({ row }) => (
          <div className="size-12 bg-[#ececf0] overflow-hidden">
            {row.original.thumbnailImage ? (
              <img
                src={row.original.thumbnailImage}
                alt={row.original.title}
                className="size-full object-cover"
              />
            ) : (
              <div className="size-full flex items-center justify-center">
                <Package className="size-4 text-[#717182]" />
              </div>
            )}
          </div>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium hover:bg-transparent"
          >
            Product
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-sm group-hover:text-black">{row.original.title}</p>
            <p className="text-xs text-[#717182] group-hover:text-[#444]">{row.original.id}</p>
          </div>
        ),
      },
      {
        accessorKey: "category",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium hover:bg-transparent"
          >
            Category
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {row.original.category}
          </Badge>
        ),
      },
      {
        accessorKey: "price",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-auto p-0 font-medium hover:bg-transparent"
          >
            Price
            <ArrowUpDown className="ml-2 size-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="text-sm group-hover:text-black">
            ${row.original.price.toFixed(2)} {row.original.currency}
          </span>
        ),
      },
      {
        accessorKey: "fulfillmentProvider",
        header: "Provider",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "font-normal capitalize",
              row.original.fulfillmentProvider === "printful" && "bg-[#3d7fff]/10 text-[#3d7fff] border-[#3d7fff]",
              row.original.fulfillmentProvider === "gelato" && "bg-[#635bff]/10 text-[#635bff] border-[#635bff]"
            )}
          >
            {row.original.fulfillmentProvider}
          </Badge>
        ),
      },
      {
        accessorKey: "variants",
        header: "Variants",
        cell: ({ row }) => (
          <span className="text-sm text-[#717182] group-hover:text-[#444]">{row.original.variants?.length || 0}</span>
        ),
      },
      {
        id: "listed",
        accessorKey: "listed",
        header: "Status",
        cell: ({ row }) => {
          const isListed = row.original.listed !== false;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleListing(row.original.id, isListed)}
                disabled={updateListingMutation.isPending}
                className={cn(
                  "h-8 px-2",
                  isListed
                    ? "text-[#00ec97] hover:text-[#00ec97] hover:bg-[#00ec97]/10"
                    : "text-[#717182] hover:text-[#717182] hover:bg-[#717182]/10"
                )}
                title={isListed ? "Listed - Click to delist" : "Delisted - Click to list"}
              >
                {isListed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </Button>
              <span className="text-xs text-[#717182] group-hover:text-[#444]">{isListed ? "Listed" : "Delisted"}</span>
            </div>
          );
        },
      },
    ];

  const table = useReactTable({
    data: products,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-[#ececf0] animate-pulse" />
        <div className="h-64 bg-[#ececf0] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Inventory Management</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={isSyncing}
            className="border-[rgba(0,0,0,0.1)]"
          >
            <RefreshCw className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Products"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-[rgba(0,0,0,0.1)]"
          >
            <RefreshCw className={cn("size-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatusData && (
        <div className={cn(
          "p-3 text-sm",
          syncStatusData.status === "running" && "bg-[#3d7fff]/10 text-[#3d7fff]",
          syncStatusData.status === "error" && "bg-red-500/10 text-red-500",
          syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && "bg-[#00ec97]/10 text-[#00ec97]"
        )}>
          {syncStatusData.status === "running" && "Syncing products from fulfillment providers..."}
          {syncStatusData.status === "error" && `Sync error: ${syncStatusData.errorMessage || "Unknown error"}`}
          {syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && (
            `Last synced: ${new Date(syncStatusData.lastSuccessAt).toLocaleString()}`
          )}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#717182]" />
        <Input
          placeholder="Search products..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="pl-10 bg-[#f3f3f5] border-0"
        />
      </div>

      {/* Table */}
      <div className="border border-border overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#ececf0]">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-[#717182] uppercase tracking-wider"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-border">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-[#717182]">
                  No products found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="group hover:bg-[#ececf0] transition-colors">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 group-hover:text-black">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#717182]">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            table.getFilteredRowModel().rows.length
          )}{" "}
          of {table.getFilteredRowModel().rows.length} products
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-[rgba(0,0,0,0.1)]"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-[rgba(0,0,0,0.1)]"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function OrdersManagement() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Orders</h2>
      </div>
      <div className="bg-[#ececf0] p-8 text-center">
        <ShoppingBag className="size-8 mx-auto mb-4 text-[#717182]" />
        <p className="text-[#717182]">Order management coming soon</p>
      </div>
    </div>
  );
}

function UsersManagement() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium">Users</h2>
      </div>
      <div className="bg-[#ececf0] p-8 text-center">
        <Users className="size-8 mx-auto mb-4 text-[#717182]" />
        <p className="text-[#717182]">User management coming soon</p>
      </div>
    </div>
  );
}
