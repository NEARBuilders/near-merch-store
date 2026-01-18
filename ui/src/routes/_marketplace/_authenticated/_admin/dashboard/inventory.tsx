import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useProducts, useSyncStatus, useSyncProducts, useUpdateProductListing, type Product } from "@/integrations/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/inventory")({
  component: InventoryManagement,
});

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
        <div className="size-12 bg-muted border border-border/60 overflow-hidden rounded-lg">
          {row.original.thumbnailImage ? (
            <img
              src={row.original.thumbnailImage}
              alt={row.original.title}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full flex items-center justify-center">
              <Package className="size-4 text-foreground/50 dark:text-muted-foreground" />
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
          <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground">{row.original.title}</p>
          <p className="text-xs text-foreground/50 dark:text-muted-foreground">{row.original.id}</p>
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
        <span className="text-sm text-foreground/90 dark:text-muted-foreground">
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
        <span className="text-sm text-foreground/70 dark:text-muted-foreground">{row.original.variants?.length || 0}</span>
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
                  ? "text-[#00EC97] hover:text-[#00EC97] hover:bg-[#00EC97]/10"
                  : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40"
              )}
              title={isListed ? "Listed - Click to delist" : "Delisted - Click to list"}
            >
              {isListed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </Button>
            <span className="text-xs text-foreground/70 dark:text-muted-foreground">{isListed ? "Listed" : "Delisted"}</span>
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
      <div className="space-y-6">
        <div className="rounded-2xl bg-background border border-border/60 h-20 animate-pulse" />
        <div className="rounded-2xl bg-background border border-border/60 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden max-w-full">
      {/* Header Block */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Inventory Management</h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">
            Manage your product inventory and listings
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4 mr-2", isSyncing && "animate-spin")} />
            {isSyncing ? "Syncing..." : "Sync Products"}
          </button>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("size-4 mr-2", isRefetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      {/* Sync Status Block */}
      {syncStatusData && (
        <div className={cn(
          "rounded-2xl p-4 text-sm border",
          syncStatusData.status === "running" && "bg-background border-[#3d7fff]/60 text-[#3d7fff]",
          syncStatusData.status === "error" && "bg-background border-red-500/60 text-red-500",
          syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && "bg-background border-[#00EC97]/60 text-[#00EC97]"
        )}>
          {syncStatusData.status === "running" && "Syncing products from fulfillment providers..."}
          {syncStatusData.status === "error" && `Sync error: ${syncStatusData.errorMessage || "Unknown error"}`}
          {syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && (
            `Last synced: ${new Date(syncStatusData.lastSuccessAt).toLocaleString()}`
          )}
        </div>
      )}

      {/* Search Block */}
      <div className="rounded-2xl bg-background border border-border/60 px-6 py-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/50 dark:text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97] hover:border-border/60 text-sm"
          />
        </div>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="rounded-2xl bg-background border border-border/60 overflow-hidden max-w-full">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-0">
            <thead className="bg-background/40 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left text-xs font-medium text-foreground/70 dark:text-muted-foreground uppercase tracking-wider"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/60">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-foreground/70 dark:text-muted-foreground">
                    No products found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="group hover:bg-background/40 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-border/60 overflow-x-hidden max-w-full">
          {table.getRowModel().rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-foreground/70 dark:text-muted-foreground text-sm">
              No products found
            </div>
          ) : (
            table.getRowModel().rows.map((row) => {
              const product = row.original;
              const isListed = product.listed !== false;
              return (
                <div key={row.id} className="p-4 space-y-3 hover:bg-background/40 transition-colors max-w-full overflow-x-hidden">
                  <div className="flex items-start gap-3">
                    <div className="size-16 bg-muted border border-border/60 overflow-hidden rounded-lg shrink-0">
                      {product.thumbnailImage ? (
                        <img
                          src={product.thumbnailImage}
                          alt={product.title}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center">
                          <Package className="size-5 text-foreground/50 dark:text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground truncate">{product.title}</p>
                      <p className="text-xs text-foreground/50 dark:text-muted-foreground truncate">{product.id}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="font-normal text-xs">
                          {product.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-normal text-xs capitalize",
                            product.fulfillmentProvider === "printful" && "bg-[#3d7fff]/10 text-[#3d7fff] border-[#3d7fff]",
                            product.fulfillmentProvider === "gelato" && "bg-[#635bff]/10 text-[#635bff] border-[#635bff]"
                          )}
                        >
                          {product.fulfillmentProvider}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="space-y-1">
                      <p className="text-xs text-foreground/70 dark:text-muted-foreground">
                        ${product.price.toFixed(2)} {product.currency}
                      </p>
                      <p className="text-xs text-foreground/50 dark:text-muted-foreground">
                        {product.variants?.length || 0} variants
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleListing(product.id, isListed)}
                        disabled={updateListingMutation.isPending}
                        className={cn(
                          "h-8 px-2",
                          isListed
                            ? "text-[#00EC97] hover:text-[#00EC97] hover:bg-[#00EC97]/10"
                            : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40"
                        )}
                        title={isListed ? "Listed - Click to delist" : "Delisted - Click to list"}
                      >
                        {isListed ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                      </Button>
                      <span className="text-xs text-foreground/70 dark:text-muted-foreground">{isListed ? "Listed" : "Delisted"}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Pagination Block */}
      <div className="rounded-2xl bg-background border border-border/60 px-6 py-4 overflow-x-hidden max-w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 min-w-0">
          <p className="text-sm text-foreground/90 dark:text-muted-foreground text-center md:text-left min-w-0 flex-1">
            Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              table.getFilteredRowModel().rows.length
            )}{" "}
            of {table.getFilteredRowModel().rows.length} products
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-colors disabled:opacity-50"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm text-foreground font-medium">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <button
              type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-2.5 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 hover:bg-[#00EC97] hover:border-[#00EC97] transition-colors disabled:opacity-50"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
