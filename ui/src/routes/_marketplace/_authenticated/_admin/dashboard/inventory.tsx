import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useEffect } from "react";
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
  Star,
  X,
  Plus,
  XCircle,
  ChevronDown,
} from "lucide-react";
import { ProductTitleCell } from "@/components/admin/product-title-cell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  useProducts,
  useCategories,
  useProductTypes,
  useSyncStatus,
  useSyncProducts,
  useUpdateProductCategories,
  useUpdateProductListing,
  useUpdateProductTags,
  useUpdateProductFeatured,
  useUpdateProductType,
  type Product,
} from "@/integrations/api";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/inventory")({
  component: InventoryManagement,
});



function TagsEditor({
  tags,
  productId: _productId,
  onUpdate,
  isPending
}: {
  tags: string[];
  productId: string;
  onUpdate: (tags: string[]) => void;
  isPending: boolean;
}) {
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onUpdate([...tags, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onUpdate(tags.filter((t) => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex flex-wrap gap-1.5 items-center rounded-md border border-border/60 px-2 py-1.5 hover:border-[#00EC97] transition-colors min-h-8 max-w-48"
          disabled={isPending}
          title="Edit tags"
        >
          {tags.length === 0 ? (
            <span className="text-xs text-foreground/60 dark:text-muted-foreground">No tags</span>
          ) : (
            tags.slice(0, 2).map((tag) => (
              <Badge key={tag} variant="outline" className="font-normal text-xs">
                {tag}
              </Badge>
            ))
          )}
          {tags.length > 2 && (
            <Badge variant="outline" className="font-normal text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="text-sm font-medium mb-2">Tags</div>
        <div className="flex gap-2 mb-3">
          <Input
            placeholder="Add tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 text-sm bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97]"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddTag}
            disabled={!newTag.trim()}
            className="h-8 px-2 bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-auto">
          {tags.length === 0 ? (
            <span className="text-xs text-foreground/60 dark:text-muted-foreground">
              No tags yet. Type above and press Enter to add.
            </span>
          ) : (
            tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="font-normal text-xs pr-1 flex items-center gap-1"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
);
}

// Helper functions for time and date formatting
function formatDate(timestamp: number | null): string {
  if (!timestamp) return 'N/A';
  return new Intl.DateTimeFormat(
    'en-US',
    { 
      dateStyle: 'medium', 
      timeStyle: 'short',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  ).format(new Date(timestamp));
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function InventoryManagement() {
  const { data: productsData, isLoading, refetch, isRefetching } = useProducts({ limit: 100, includeUnlisted: true });
  const products = productsData?.products || [];

  const { data: syncStatusData } = useSyncStatus();
  const syncMutation = useSyncProducts();
  const updateListingMutation = useUpdateProductListing();
  const updateCategoriesMutation = useUpdateProductCategories();
  const updateTagsMutation = useUpdateProductTags();
  const updateFeaturedMutation = useUpdateProductFeatured();
  const updateProductTypeMutation = useUpdateProductType();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories ?? [];
  const { data: productTypesData } = useProductTypes();
  const productTypes = productTypesData?.productTypes ?? [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  
  // Live sync duration counter
  const [syncDuration, setSyncDuration] = useState(0);
  
  // Error details expansion state
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const handleSync = () => {
    syncMutation.mutate(undefined);
  };

  const handleToggleListing = (productId: string, currentlyListed: boolean) => {
    updateListingMutation.mutate({ id: productId, listed: !currentlyListed });
  };

  // Update sync duration when running
  useEffect(() => {
    if (syncStatusData?.status === 'running' && syncStatusData.syncStartedAt) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - (syncStatusData.syncStartedAt ?? 0)) / 1000);
        setSyncDuration(elapsed);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSyncDuration(0);
    }
  }, [syncStatusData?.status, syncStatusData?.syncStartedAt]);

  const isSyncing = syncStatusData?.status === "running" || syncMutation.isPending;

  const columns: ColumnDef<Product>[] = [
    {
      accessorKey: "thumbnailImage",
      header: "",
      cell: ({ row }) => (
        <Link
          to="/products/$productId"
          params={{ productId: row.original.id }}
          className="block"
        >
          <div className="size-12 bg-muted border border-border/60 overflow-hidden rounded-lg group-hover:border-[#00EC97] group-hover:opacity-80 transition-all cursor-pointer">
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
        </Link>
      ),
      enableSorting: false,
      size: 48,
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
      cell: ({ row }) => {
        return (
          <ProductTitleCell product={row.original} />
        );
      },
      size: 200,
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
      size: 100,
    },
    {
      accessorKey: "featured",
      header: "Featured",
      cell: ({ row }) => {
        const isFeatured = row.original.featured === true;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateFeaturedMutation.mutate({
              id: row.original.id,
              featured: !isFeatured
            })}
            disabled={updateFeaturedMutation.isPending}
            className={cn(
              "h-8 px-2",
              isFeatured
                ? "text-[#00EC97] hover:text-[#00EC97] hover:bg-[#00EC97]/10"
                : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40"
            )}
            title={isFeatured ? "Featured - Click to unfeature" : "Not featured - Click to feature"}
          >
            <Star className={cn("size-4", isFeatured && "fill-[#00EC97]")} />
          </Button>
        );
      },
      size: 80,
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
      size: 100,
    },
    {
      accessorKey: "collections",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-auto p-0 font-medium hover:bg-transparent"
        >
          Collections
          <ArrowUpDown className="ml-2 size-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const selected = row.original.collections ?? [];
        const selectedSlugs = selected.map((c) => c.slug);

        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex flex-wrap gap-1.5 items-center rounded-md border border-border/60 px-2 py-1.5 hover:border-[#00EC97] transition-colors min-h-8"
                disabled={updateCategoriesMutation.isPending}
                title="Edit collections"
              >
                {selected.length === 0 ? (
                  <span className="text-xs text-foreground/60 dark:text-muted-foreground">No collections</span>
                ) : (
                  selected.slice(0, 2).map((c) => (
                    <Badge key={c.slug} variant="outline" className="font-normal text-xs">
                      {c.name}
                    </Badge>
                  ))
                )}
                {selected.length > 2 && (
                  <Badge variant="outline" className="font-normal text-xs">
                    +{selected.length - 2}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="text-sm font-medium mb-2">Collections</div>
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                {categories.length === 0 ? (
                  <div className="text-xs text-foreground/60 dark:text-muted-foreground">
                    No collections yet. Create some in Dashboard → Collections.
                  </div>
                ) : (
                  categories.map((cat) => {
                    const checked = selectedSlugs.includes(cat.slug);
                    return (
                      <label key={cat.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const nextChecked = Boolean(next);
                            const nextSlugs = nextChecked
                              ? Array.from(new Set([...selectedSlugs, cat.slug]))
                              : selectedSlugs.filter((slug) => slug !== cat.slug);
                            updateCategoriesMutation.mutate({ id: row.original.id, categoryIds: nextSlugs });
                          }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
      size: 220,
    },
    {
      accessorKey: "productType",
      header: "Type",
      cell: ({ row }) => {
        const selected = row.original.productType?.slug;
        return (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex flex-wrap gap-1.5 items-center rounded-md border border-border/60 px-2 py-1.5 hover:border-[#00EC97] transition-colors min-h-8"
                disabled={updateProductTypeMutation.isPending}
                title="Edit product type"
              >
                {!selected ? (
                  <span className="text-xs text-foreground/60 dark:text-muted-foreground">No type</span>
                ) : (
                  <Badge variant="outline" className="font-normal text-xs">
                    {productTypes.find(pt => pt.slug === selected)?.label || selected}
                  </Badge>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <div className="text-sm font-medium mb-2">Product Type</div>
              <div className="space-y-2 max-h-64 overflow-auto pr-1">
                <label key="none" className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={!selected}
                    onCheckedChange={(next) => {
                      if (next) {
                        updateProductTypeMutation.mutate({ id: row.original.id, productTypeSlug: null });
                      }
                    }}
                  />
                  <span className="text-foreground/60 dark:text-muted-foreground">None</span>
                </label>
                {productTypes.map((pt) => {
                  const checked = selected === pt.slug;
                  return (
                    <label key={pt.slug} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          if (next) {
                            updateProductTypeMutation.mutate({ id: row.original.id, productTypeSlug: pt.slug });
                          }
                        }}
                      />
                      <span className="truncate">{pt.label}</span>
                    </label>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        );
      },
      size: 140,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <TagsEditor
          tags={row.original.tags ?? []}
          productId={row.original.id}
          onUpdate={(tags) => updateTagsMutation.mutate({ id: row.original.id, tags })}
          isPending={updateTagsMutation.isPending}
        />
      ),
      size: 180,
    },
    {
      accessorKey: "variants",
      header: "Variants",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/70 dark:text-muted-foreground">{row.original.variants?.length || 0}</span>
      ),
      size: 80,
      meta: {
        hideOnMobile: true,
      },
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
      size: 100,
      meta: {
        hideOnMobile: true,
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
    getRowId: (row) => row.id,
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold tracking-tight mb-2">Inventory Management</h2>
            <p className="text-sm text-foreground/90 dark:text-muted-foreground">
              Manage your product inventory and listings
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
              <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading inventory...</p>
            </div>
          </div>
        </div>
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
            {isSyncing ? (
              <>
                Syncing...
                {syncDuration > 0 && ` (${formatDuration(syncDuration)})`}
              </>
            ) : "Sync Products"}
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
        <Card className={cn(
          "rounded-2xl border p-4",
          syncStatusData.status === "running" && "border-[#3d7fff]/60 bg-background/60",
          syncStatusData.status === "error" && "border-red-500/60 bg-background/60",
          syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && "border-[#00EC97]/60 bg-background/60"
        )}>
          {syncStatusData.status === "running" && (
            <div className="flex items-center gap-2 text-sm">
              <RefreshCw className="size-4 animate-spin text-[#3d7fff]" />
              <span className="text-[#3d7fff] font-medium">Syncing products from fulfillment providers...</span>
              {syncDuration > 0 && <span className="text-[#3d7fff]/70">({formatDuration(syncDuration)})</span>}
            </div>
          )}
          {syncStatusData.status === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <XCircle className="size-5 text-red-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-red-500">Sync failed</p>
                  <p className="text-sm text-red-500/80">{syncStatusData.errorMessage || "Unknown error"}</p>
                </div>
              </div>
              {syncStatusData.errorData && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="flex items-center gap-1.5 text-xs text-red-500/70 hover:text-red-500 transition-colors"
                  >
                    <span>{showErrorDetails ? "Hide" : "Show"} details</span>
                    <ChevronDown className={cn("size-3.5 transition-transform", showErrorDetails && "rotate-180")} />
                  </button>
                  {showErrorDetails && (
                    <div className="bg-background/50 rounded-lg p-3 border border-red-500/20">
                      <pre className="text-xs text-red-500/70 whitespace-pre-wrap font-mono">
                        {JSON.stringify(syncStatusData.errorData, null, 2)}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          {syncStatusData.status === "idle" && syncStatusData.lastSuccessAt && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#00EC97] font-medium">Last synced:</span>
              <span className="text-[#00EC97]/70">{formatDate(syncStatusData.lastSuccessAt)}</span>
            </div>
          )}
        </Card>
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
                    <Link
                      to="/products/$productId"
                      params={{ productId: product.id }}
                      className="shrink-0"
                    >
                      <div className="size-16 bg-muted border border-border/60 overflow-hidden rounded-lg group-hover:border-[#00EC97] transition-colors">
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
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link
                        to="/products/$productId"
                        params={{ productId: product.id }}
                        className="block w-full"
                      >
                        <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground truncate hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors">{product.title}</p>
                      </Link>
                      <div className="flex items-center gap-2 mt-2">
                        {product.collections && product.collections.length > 0 && (
                          <Badge variant="outline" className="font-normal text-xs">
                            {product.collections[0]?.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/60">
                    <div className="space-y-1">
                      <p className="text-xs text-foreground/70 dark:text-muted-foreground">
                        ${product.price.toFixed(2)} {product.currency}
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
