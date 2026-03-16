import { createFileRoute, Link } from "@tanstack/react-router";
import { Fragment, useState, useEffect, useMemo, useRef } from "react";
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
import { Label } from "@/components/ui/label";
import {
  useProducts,
  useCategories,
  useProductTypes,
  useSyncStatus,
  useSyncProducts,
  useSyncProgressSubscription,
  useCancelSync,
  useUpdateProductCategories,
  useUpdateProductListing,
  useUpdateProductTags,
  useUpdateProductFeatured,
  useUpdateProductType,
  useCreateProductType,
  useUpdateProductMetadata,
  type Product,
  type FeeConfig,
  type ProductMetadata,
} from "@/integrations/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
  "/_marketplace/_authenticated/_admin/dashboard/inventory",
)({
  component: InventoryManagement,
});

function TagsEditor({
  tags,
  onUpdate,
  isPending,
}: {
  tags: string[];
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
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Add tag..."
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97]"
        />
        <Button
          type="button"
          size="sm"
          onClick={handleAddTag}
          disabled={!newTag.trim() || isPending}
          className="h-9 px-3 bg-[#00EC97] text-black hover:bg-[#00d97f]"
        >
          <Plus className="size-4" />
        </Button>
      </div>
      <div className="flex min-h-10 flex-wrap gap-1.5 rounded-lg border border-border/60 bg-background/40 p-3">
        {tags.length === 0 ? (
          <span className="text-xs text-foreground/60 dark:text-muted-foreground">
            No tags yet. Type above and press Enter to add.
          </span>
        ) : (
          tags.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="flex items-center gap-1 pr-1 font-normal text-xs"
            >
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                disabled={isPending}
                className="ml-1 transition-colors hover:text-red-500 disabled:opacity-50"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

function ProductTypeEditor({
  currentType,
  availableTypes,
  onUpdate,
  isPending,
}: {
  currentType: string | null;
  availableTypes: Array<{ slug: string; label: string }>;
  onUpdate: (slug: string | null) => void;
  isPending: boolean;
}) {
  const [newTypeLabel, setNewTypeLabel] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const createMutation = useCreateProductType();

  const generateSlug = (label: string): string => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const handleCreateType = () => {
    const trimmed = newTypeLabel.trim();
    if (!trimmed) return;

    const slug = generateSlug(trimmed);
    setIsCreating(true);

    createMutation.mutate(
      { slug, label: trimmed },
      {
        onSuccess: () => {
          onUpdate(slug);
          setNewTypeLabel("");
          setIsCreating(false);
        },
        onError: () => {
          setIsCreating(false);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateType();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 max-h-48 overflow-auto pr-1">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox
            checked={!currentType}
            onCheckedChange={(next) => {
              if (next) onUpdate(null);
            }}
          />
          <span className="text-foreground/60 dark:text-muted-foreground">
            None
          </span>
        </label>
        {availableTypes.map((pt) => {
          const checked = currentType === pt.slug;
          return (
            <label
              key={pt.slug}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => {
                  if (next) onUpdate(pt.slug);
                }}
              />
              <span className="truncate">{pt.label}</span>
            </label>
          );
        })}
      </div>
      <div className="border-t border-border/60 pt-3">
        <div className="flex gap-2">
          <Input
            placeholder="New type..."
            value={newTypeLabel}
            onChange={(e) => setNewTypeLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#00EC97]"
            disabled={isCreating || createMutation.isPending || isPending}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleCreateType}
            disabled={
              !newTypeLabel.trim() ||
              isCreating ||
              createMutation.isPending ||
              isPending
            }
            className="h-9 px-3 bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            <Plus className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MetadataEditor({
  metadata,
  onUpdate,
  isPending,
}: {
  metadata?: ProductMetadata;
  onUpdate: (metadata: ProductMetadata) => void;
  isPending: boolean;
}) {
  const [localMetadata, setLocalMetadata] = useState<ProductMetadata>(
    metadata || { fees: [] },
  );
  const [newFee, setNewFee] = useState<Partial<FeeConfig> & { percentage?: string }>({
    type: "royalty",
    label: "",
    recipient: "",
    bps: 0,
    percentage: "",
  });

  useEffect(() => {
    setLocalMetadata(metadata || { fees: [] });
  }, [metadata]);

  const handleAddFee = () => {
    if (!newFee.label || !newFee.recipient || !newFee.percentage) return;
    const percentage = parseFloat(newFee.percentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) return;
    const bps = Math.round(percentage * 100);
    const fee: FeeConfig = {
      type: newFee.type as FeeConfig["type"],
      label: newFee.label,
      recipient: newFee.recipient,
      bps,
    };
    const updated = { ...localMetadata, fees: [...localMetadata.fees, fee] };
    setLocalMetadata(updated);
    setNewFee({ type: "royalty", label: "", recipient: "", bps: 0, percentage: "" });
  };

  const handleRemoveFee = (index: number) => {
    const updated = {
      ...localMetadata,
      fees: localMetadata.fees.filter((_: FeeConfig, i: number) => i !== index),
    };
    setLocalMetadata(updated);
  };

  const handleSave = () => {
    onUpdate(localMetadata);
  };

  const totalBps = localMetadata.fees.reduce(
    (sum: number, f: FeeConfig) => sum + f.bps,
    0,
  );
  const totalPercentage = totalBps / 100;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Creator Account ID</Label>
          <Input
            placeholder="creator.near"
            value={localMetadata.creatorAccountId || ""}
            onChange={(e) =>
              setLocalMetadata({
                ...localMetadata,
                creatorAccountId: e.target.value || undefined,
              })
            }
            className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label>Purchase Gate</Label>
          <Select
            value={localMetadata.purchaseGate?.pluginId ?? "none"}
            onValueChange={(value) =>
              setLocalMetadata((current) => ({
                ...current,
                purchaseGate:
                  value === "none"
                    ? undefined
                    : { pluginId: value as "legion-holder" },
              }))
            }
          >
            <SelectTrigger className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="legion-holder">Legion Holder</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-foreground/50">
            Gated products stay visible but require the selected plugin to purchase.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Fee Splits</Label>
            <p className="text-xs text-foreground/50">
              Total: {totalPercentage}% ({totalBps} bps)
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {localMetadata.fees.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-xs text-foreground/60 dark:text-muted-foreground">
              No fee splits configured yet.
            </div>
          ) : (
            localMetadata.fees.map((fee: FeeConfig, index: number) => (
              <div
                key={index}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs"
              >
                <span className="flex-1 truncate">{fee.label}</span>
                <span className="text-foreground/60">{fee.recipient}</span>
                <span className="text-foreground/60">{fee.bps / 100}%</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFee(index)}
                  disabled={isPending}
                  className="transition-colors hover:text-red-500 disabled:opacity-50"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="grid gap-2 md:grid-cols-[120px_minmax(0,1fr)]">
          <Select
            value={newFee.type}
            onValueChange={(v) =>
              setNewFee({ ...newFee, type: v as FeeConfig["type"] })
            }
          >
            <SelectTrigger className="h-9 text-xs bg-background/60 border border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="royalty">Royalty</SelectItem>
              <SelectItem value="affiliate">Affiliate</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Label"
            value={newFee.label || ""}
            onChange={(e) => setNewFee({ ...newFee, label: e.target.value })}
            className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg"
          />
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_96px_auto]">
          <Input
            placeholder="recipient.near"
            value={newFee.recipient || ""}
            onChange={(e) => setNewFee({ ...newFee, recipient: e.target.value })}
            className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg"
          />
          <Input
            type="number"
            placeholder="%"
            min="0"
            max="100"
            step="0.01"
            value={newFee.percentage || ""}
            onChange={(e) => setNewFee({ ...newFee, percentage: e.target.value })}
            className="h-9 text-sm bg-background/60 border border-border/60 rounded-lg"
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddFee}
            disabled={
              !newFee.label || !newFee.recipient || !newFee.percentage || isPending
            }
            className="h-9 px-3 bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            <Plus className="mr-1 size-4" />
            Add Fee
          </Button>
        </div>
      </div>

      <div className="flex justify-end border-t border-border/60 pt-3">
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={isPending}
          className="h-9 bg-[#00EC97] text-black hover:bg-[#00d97f]"
        >
          Save Metadata
        </Button>
      </div>
    </div>
  );
}

function MetadataSummary({ metadata }: { metadata?: ProductMetadata }) {
  const resolvedMetadata = metadata ?? { fees: [] };
  const totalBps = resolvedMetadata.fees.reduce(
    (sum: number, fee: FeeConfig) => sum + fee.bps,
    0,
  );
  const totalPercentage = totalBps / 100;

  if (
    resolvedMetadata.fees.length === 0 &&
    !resolvedMetadata.creatorAccountId &&
    !resolvedMetadata.purchaseGate?.pluginId
  ) {
    return (
      <span className="text-xs text-foreground/60 dark:text-muted-foreground">
        No metadata
      </span>
    );
  }

  return (
    <div className="flex max-w-48 flex-wrap items-center gap-1.5">
      {resolvedMetadata.creatorAccountId && (
        <Badge variant="outline" className="max-w-40 truncate font-normal text-xs">
          {resolvedMetadata.creatorAccountId}
        </Badge>
      )}
      {resolvedMetadata.fees.length > 0 && (
        <span className="text-xs text-foreground/60">{totalPercentage}%</span>
      )}
      {resolvedMetadata.purchaseGate?.pluginId && (
        <Badge variant="outline" className="font-normal text-xs">
          {resolvedMetadata.purchaseGate.pluginId}
        </Badge>
      )}
    </div>
  );
}

function ExpandedProductPanel({
  product,
  categories,
  productTypes,
  onUpdateCollections,
  onUpdateType,
  onUpdateTags,
  onUpdateMetadata,
  isUpdatingCollections,
  isUpdatingType,
  isUpdatingTags,
  isUpdatingMetadata,
}: {
  product: Product;
  categories: Array<{ slug: string; name: string }>;
  productTypes: Array<{ slug: string; label: string }>;
  onUpdateCollections: (categoryIds: string[]) => void;
  onUpdateType: (slug: string | null) => void;
  onUpdateTags: (tags: string[]) => void;
  onUpdateMetadata: (metadata: ProductMetadata) => void;
  isUpdatingCollections: boolean;
  isUpdatingType: boolean;
  isUpdatingTags: boolean;
  isUpdatingMetadata: boolean;
}) {
  const selectedCollections = product.collections ?? [];
  const selectedSlugs = selectedCollections.map((collection) => collection.slug);

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-medium">Collections</h4>
              <p className="text-xs text-foreground/60 dark:text-muted-foreground">
                Assign this product to one or more collections.
              </p>
            </div>
          </div>
          <div className="space-y-2 max-h-56 overflow-auto pr-1">
            {categories.length === 0 ? (
              <div className="text-xs text-foreground/60 dark:text-muted-foreground">
                No collections yet. Create some in Dashboard -&gt; Collections.
              </div>
            ) : (
              categories.map((category) => {
                const checked = selectedSlugs.includes(category.slug);

                return (
                  <label
                    key={category.slug}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const nextChecked = Boolean(next);
                        const nextSlugs = nextChecked
                          ? Array.from(new Set([...selectedSlugs, category.slug]))
                          : selectedSlugs.filter((slug) => slug !== category.slug);

                        onUpdateCollections(nextSlugs);
                      }}
                      disabled={isUpdatingCollections}
                    />
                    <span className="truncate">{category.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-4">
          <div className="mb-3">
            <h4 className="text-sm font-medium">Product Type</h4>
            <p className="text-xs text-foreground/60 dark:text-muted-foreground">
              Pick an existing type or create a new one.
            </p>
          </div>
          <ProductTypeEditor
            currentType={product.productType?.slug ?? null}
            availableTypes={productTypes}
            onUpdate={onUpdateType}
            isPending={isUpdatingType}
          />
        </div>

        <div className="rounded-xl border border-border/60 bg-background/40 p-4 md:col-span-2">
          <div className="mb-3">
            <h4 className="text-sm font-medium">Tags</h4>
            <p className="text-xs text-foreground/60 dark:text-muted-foreground">
              Tags help organize and surface products across the admin tools.
            </p>
          </div>
          <TagsEditor
            tags={product.tags ?? []}
            onUpdate={onUpdateTags}
            isPending={isUpdatingTags}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-background/40 p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium">Metadata</h4>
          <p className="text-xs text-foreground/60 dark:text-muted-foreground">
            Manage creator attribution, purchase gates, and fee splits without the popover.
          </p>
        </div>
        <MetadataEditor
          metadata={product.metadata as ProductMetadata | undefined}
          onUpdate={onUpdateMetadata}
          isPending={isUpdatingMetadata}
        />
      </div>
    </div>
  );
}

// Helper functions for time and date formatting
function formatDate(timestamp: number | null): string {
  if (!timestamp) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(new Date(timestamp));
}

function formatDuration(seconds: number): string {
  if (seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getProductRecencyTime(product: Product): number {
  const timestamp = product.lastSyncedAt ?? product.createdAt;
  const parsed = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function InventoryManagement() {
  const [syncCancelledAt, setSyncCancelledAt] = useState<number | null>(null);

  // Derived sync state - use server status only (not mutation pending)
  const wasCancelledRecently =
    syncCancelledAt && Date.now() - syncCancelledAt < 3000;

  // Get sync status first to determine if we should poll
  const { data: syncStatusData } = useSyncStatus();
  const isRunning =
    syncStatusData?.status === "running" && !wasCancelledRecently;

  // Main products query with dynamic polling based on sync status
  const {
    data: productsData,
    isLoading,
    refetch,
    isRefetching,
  } = useProducts({
    limit: 500,
    includeUnlisted: true,
    refetchInterval: isRunning ? 3000 : false, // Poll every 3s during sync
    refetchOnWindowFocus: isRunning, // Refetch when window regains focus during sync
  });
  const products = productsData?.products || [];

  const syncMutation = useSyncProducts();
  const cancelSyncMutation = useCancelSync();
  const updateListingMutation = useUpdateProductListing();
  const updateCategoriesMutation = useUpdateProductCategories();
  const updateTagsMutation = useUpdateProductTags();
  const updateFeaturedMutation = useUpdateProductFeatured();
  const updateProductTypeMutation = useUpdateProductType();
  const updateMetadataMutation = useUpdateProductMetadata();
  const { data: categoriesData } = useCategories();
  const categories = categoriesData?.categories ?? [];
  const { data: productTypesData } = useProductTypes();
  const productTypes = productTypesData?.productTypes ?? [];

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [showSuccessDetails, setShowSuccessDetails] = useState(false);
  // Track current sync progress for display
  const [syncProgress, setSyncProgress] = useState<{
    synced: number;
    failed: number;
    total: number;
  } | null>(null);
  const [newlySyncedProductIds, setNewlySyncedProductIds] = useState<string[]>(
    [],
  );
  const [isTrackingSyncNewItems, setIsTrackingSyncNewItems] = useState(false);
  const previousProductIdsRef = useRef<Set<string> | null>(null);

  // Subscribe to real-time progress updates
  const { events: progressEvents, finalEvent: progressFinalEvent } =
    useSyncProgressSubscription(isRunning);

  // Update progress display from events
  useEffect(() => {
    if (progressEvents.length > 0) {
      const lastEvent = progressEvents[progressEvents.length - 1];
      const totalSynced = lastEvent.totalSynced ?? 0;
      const totalFailed = lastEvent.totalFailed ?? 0;
      // Estimate total from providers or use a reasonable guess
      let estimatedTotal = 0;
      Object.values(lastEvent.providers || {}).forEach((p: any) => {
        estimatedTotal += p.total || 0;
      });
      // If we don't have a total yet, use synced + failed + buffer
      if (estimatedTotal === 0) {
        estimatedTotal = Math.max(
          totalSynced + totalFailed + 10,
          products.length,
        );
      }
      setSyncProgress({
        synced: totalSynced,
        failed: totalFailed,
        total: estimatedTotal,
      });
    }
  }, [progressEvents, products.length]);

  useEffect(() => {
    const currentProductIds = new Set(products.map((product) => product.id));

    if (previousProductIdsRef.current == null) {
      previousProductIdsRef.current = currentProductIds;
      return;
    }

    if (isTrackingSyncNewItems) {
      const nextNewIds = products
        .filter((product) => !previousProductIdsRef.current?.has(product.id))
        .map((product) => product.id);

      if (nextNewIds.length > 0) {
        setNewlySyncedProductIds((currentIds) =>
          Array.from(new Set([...nextNewIds, ...currentIds])),
        );
      }
    }

    previousProductIdsRef.current = currentProductIds;
  }, [products, isTrackingSyncNewItems]);

  const hasError =
    syncStatusData?.status === "error" ||
    progressFinalEvent?.status === "error";
  const hasTerminalProgress = progressFinalEvent != null;
  const showSyncStatus =
    isRunning ||
    hasTerminalProgress ||
    hasError ||
    syncStatusData?.lastSuccessAt;

  // Build progress data from subscription
  const syncProgressData = {
    events: progressEvents,
    finalEvent: progressFinalEvent,
  };

  useEffect(() => {
    if (isTrackingSyncNewItems && !isRunning && !syncMutation.isPending) {
      setIsTrackingSyncNewItems(false);
    }
  }, [isTrackingSyncNewItems, isRunning, syncMutation.isPending]);

  const newlySyncedProductIdSet = useMemo(
    () => new Set(newlySyncedProductIds),
    [newlySyncedProductIds],
  );

  const tableData = useMemo(() => {
    if (sorting.length > 0 || newlySyncedProductIdSet.size === 0) {
      if (sorting.length > 0) {
        return products;
      }

      return [...products].sort((a, b) => {
        const recencyDiff = getProductRecencyTime(b) - getProductRecencyTime(a);

        if (recencyDiff !== 0) {
          return recencyDiff;
        }

        return a.title.localeCompare(b.title);
      });
    }

    return [...products].sort((a, b) => {
      const aIsNew = newlySyncedProductIdSet.has(a.id);
      const bIsNew = newlySyncedProductIdSet.has(b.id);

      if (aIsNew !== bIsNew) {
        return aIsNew ? -1 : 1;
      }

      const recencyDiff = getProductRecencyTime(b) - getProductRecencyTime(a);

      if (recencyDiff !== 0) {
        return recencyDiff;
      }

      return a.title.localeCompare(b.title);
    });
  }, [products, sorting.length, newlySyncedProductIdSet]);

  const handleSync = () => {
    setSyncCancelledAt(null); // Reset cancel state on new sync
    previousProductIdsRef.current = new Set(products.map((product) => product.id));
    setNewlySyncedProductIds([]);
    setIsTrackingSyncNewItems(true);
    syncMutation.mutate(undefined);
  };

  const handleCancelSync = () => {
    setSyncCancelledAt(Date.now());
    setIsTrackingSyncNewItems(false);
    cancelSyncMutation.mutate(undefined, {
      onSettled: () => {
        // Clear cancel state after 2 seconds to allow state to settle
        setTimeout(() => setSyncCancelledAt(null), 2000);
      },
    });
  };

  const handleToggleListing = (productId: string, currentlyListed: boolean) => {
    updateListingMutation.mutate({ id: productId, listed: !currentlyListed });
  };

  // Live timer for sync duration
  const [syncDuration, setSyncDuration] = useState(0);

  useEffect(() => {
    if (!isRunning) {
      setSyncDuration(0);
      return;
    }

    const startedAt = syncStatusData?.syncStartedAt;
    if (!startedAt) {
      setSyncDuration(0);
      return;
    }

    const updateDuration = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSyncDuration(elapsed);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [isRunning, syncStatusData?.syncStartedAt]);

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
        const isNewProduct = newlySyncedProductIdSet.has(row.original.id);

        return (
          <div className="space-y-1.5">
            <ProductTitleCell product={row.original} />
            {isNewProduct && (
              <Badge className="w-fit border-[#00EC97]/40 bg-[#00EC97]/10 text-[#00EC97] hover:bg-[#00EC97]/10">
                New
              </Badge>
            )}
          </div>
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
                  : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40",
              )}
              title={
                isListed
                  ? "Listed - Click to delist"
                  : "Delisted - Click to list"
              }
            >
              {isListed ? (
                <Eye className="size-4" />
              ) : (
                <EyeOff className="size-4" />
              )}
            </Button>
            <span className="text-xs text-foreground/70 dark:text-muted-foreground">
              {isListed ? "Listed" : "Delisted"}
            </span>
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
            onClick={() =>
              updateFeaturedMutation.mutate({
                id: row.original.id,
                featured: !isFeatured,
              })
            }
            disabled={updateFeaturedMutation.isPending}
            className={cn(
              "h-8 px-2",
              isFeatured
                ? "text-[#00EC97] hover:text-[#00EC97] hover:bg-[#00EC97]/10"
                : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40",
            )}
            title={
              isFeatured
                ? "Featured - Click to unfeature"
                : "Not featured - Click to feature"
            }
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
                  <span className="text-xs text-foreground/60 dark:text-muted-foreground">
                    No collections
                  </span>
                ) : (
                  selected.slice(0, 2).map((c) => (
                    <Badge
                      key={c.slug}
                      variant="outline"
                      className="font-normal text-xs"
                    >
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
                      <label
                        key={cat.slug}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(next) => {
                            const nextChecked = Boolean(next);
                            const nextSlugs = nextChecked
                              ? Array.from(
                                  new Set([...selectedSlugs, cat.slug]),
                                )
                              : selectedSlugs.filter(
                                  (slug) => slug !== cat.slug,
                                );
                            updateCategoriesMutation.mutate({
                              id: row.original.id,
                              categoryIds: nextSlugs,
                            });
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
      cell: ({ row }) => (
        <ProductTypeEditor
          currentType={row.original.productType?.slug ?? null}
          availableTypes={productTypes}
          onUpdate={(slug) =>
            updateProductTypeMutation.mutate({
              id: row.original.id,
              productTypeSlug: slug,
            })
          }
          isPending={updateProductTypeMutation.isPending}
        />
      ),
      size: 140,
    },
    {
      accessorKey: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <TagsEditor
          tags={row.original.tags ?? []}
          productId={row.original.id}
          onUpdate={(tags) =>
            updateTagsMutation.mutate({ id: row.original.id, tags })
          }
          isPending={updateTagsMutation.isPending}
        />
      ),
      size: 180,
    },
    {
      accessorKey: "metadata",
      header: "Metadata",
      cell: ({ row }) => (
        <MetadataEditor
          metadata={row.original.metadata as ProductMetadata | undefined}
          productId={row.original.id}
          onUpdate={(metadata) =>
            updateMetadataMutation.mutate({
              id: row.original.id,
              metadata: metadata,
            })
          }
          isPending={updateMetadataMutation.isPending}
        />
      ),
      size: 140,
    },
    {
      accessorKey: "variants",
      header: "Variants",
      cell: ({ row }) => (
        <span className="text-sm text-foreground/70 dark:text-muted-foreground">
          {row.original.variants?.length || 0}
        </span>
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
            row.original.fulfillmentProvider === "printful" &&
              "bg-[#3d7fff]/10 text-[#3d7fff] border-[#3d7fff]",
            row.original.fulfillmentProvider === "gelato" &&
              "bg-[#635bff]/10 text-[#635bff] border-[#635bff]",
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
    data: tableData,
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

  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const currentPageStart =
    filteredRowCount === 0
      ? 0
      : table.getState().pagination.pageIndex *
          table.getState().pagination.pageSize +
        1;
  const currentPageEnd = Math.min(
    (table.getState().pagination.pageIndex + 1) *
      table.getState().pagination.pageSize,
    filteredRowCount,
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-bold tracking-tight mb-2">
              Inventory Management
            </h2>
            <p className="text-sm text-foreground/90 dark:text-muted-foreground">
              Manage your product inventory and listings
            </p>
          </div>
        </div>
        <div className="rounded-2xl bg-background border border-border/60 px-6 py-12">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
              <p className="text-sm text-foreground/90 dark:text-muted-foreground">
                Loading inventory...
              </p>
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
          <h2 className="text-3xl font-bold tracking-tight mb-2">
            Inventory Management
          </h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">
            Manage your product inventory and listings
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap shrink-0">
          {isRunning ? (
            <button
              type="button"
              onClick={handleCancelSync}
              disabled={cancelSyncMutation.isPending}
              className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-red-500/60 text-red-500 flex items-center justify-center font-semibold text-sm hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              <XCircle className="size-4 mr-2" />
              Cancel Sync
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={cn(
                  "size-4 mr-2",
                  syncMutation.isPending && "animate-spin",
                )}
              />
              {syncMutation.isPending ? "Starting..." : "Sync Products"}
            </button>
          )}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="px-6 py-3 rounded-lg bg-background/60 backdrop-blur-sm border border-border/60 text-foreground flex items-center justify-center font-semibold text-sm hover:bg-[#00EC97] hover:border-[#00EC97] hover:text-black transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={cn("size-4 mr-2", isRefetching && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Sync Status Block */}
      {showSyncStatus && (
        <Card
          className={cn(
            "rounded-2xl border p-4",
            isRunning && "border-[#3d7fff]/60 bg-background/60",
            hasError && "border-red-500/60 bg-background/60",
            !isRunning &&
              !hasError &&
              syncStatusData?.lastSuccessAt &&
              "border-[#00EC97]/60 bg-background/60",
          )}
        >
          {/* Running View */}
          {isRunning && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="size-4 animate-spin text-[#3d7fff]" />
                <span className="text-[#3d7fff] font-medium">
                  {syncProgress
                    ? `Synced ${syncProgress.synced} of ~${syncProgress.total} products...`
                    : "Syncing products..."}
                </span>
                {syncDuration > 0 && (
                  <span className="text-[#3d7fff]/70">
                    ({formatDuration(syncDuration)})
                  </span>
                )}
              </div>

              {/* Progress bar */}
              {syncProgress && syncProgress.total > 0 && (
                <div className="space-y-1">
                  <div className="h-2 bg-background/60 rounded-full overflow-hidden border border-border/40">
                    <div
                      className="h-full bg-[#3d7fff] transition-all duration-500 ease-out"
                      style={{
                        width: `${Math.min((syncProgress.synced / syncProgress.total) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs text-[#3d7fff]/70">
                    <span>{syncProgress.synced} synced</span>
                    {syncProgress.failed > 0 && (
                      <span className="text-yellow-500">
                        {syncProgress.failed} failed
                      </span>
                    )}
                    <span>{products.length} in inventory</span>
                  </div>
                </div>
              )}

              {/* Provider status */}
              {progressEvents.length > 0 && (
                <div className="text-xs text-[#3d7fff]/60 space-y-1">
                  {Object.entries(
                    progressEvents[progressEvents.length - 1]?.providers || {},
                  ).map(([name, provider]: [string, any]) => (
                    <div key={name} className="flex items-center gap-2">
                      <span className="capitalize">{name}:</span>
                      <span>{provider.synced} synced</span>
                      {provider.failed > 0 && (
                        <span className="text-yellow-500/80">
                          ({provider.failed} failed)
                        </span>
                      )}
                      {provider.phase && (
                        <span className="text-[#3d7fff]/40">
                          - {provider.phase.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error View */}
          {hasError && (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <XCircle className="size-5 text-red-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium text-red-500">
                    Sync failed
                  </p>
                  <p className="text-sm text-red-500/80">
                    {syncStatusData?.errorMessage ||
                      syncProgressData?.finalEvent?.message ||
                      "Unknown error"}
                  </p>
                </div>
              </div>
              {syncStatusData?.errorData && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowErrorDetails(!showErrorDetails)}
                    className="flex items-center gap-1.5 text-xs text-red-500/70 hover:text-red-500 transition-colors"
                  >
                    <span>{showErrorDetails ? "Hide" : "Show"} details</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform",
                        showErrorDetails && "rotate-180",
                      )}
                    />
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

          {/* Success View */}
          {!isRunning && !hasError && syncStatusData?.lastSuccessAt && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-[#00EC97] font-medium">
                    Last synced:
                  </span>
                  <span className="text-[#00EC97]/70">
                    {formatDate(syncStatusData.lastSuccessAt)}
                  </span>
                </div>
                {syncProgressData?.finalEvent?.status === "completed" && (
                  <button
                    type="button"
                    onClick={() => setShowSuccessDetails(!showSuccessDetails)}
                    className="flex items-center gap-1.5 text-xs text-[#00EC97]/70 hover:text-[#00EC97] transition-colors"
                  >
                    <span>{showSuccessDetails ? "Hide" : "Show"} details</span>
                    <ChevronDown
                      className={cn(
                        "size-3.5 transition-transform",
                        showSuccessDetails && "rotate-180",
                      )}
                    />
                  </button>
                )}
              </div>

              {showSuccessDetails &&
                syncProgressData?.finalEvent?.status === "completed" && (
                  <div className="bg-background/50 rounded-lg p-3 border border-[#00EC97]/20 space-y-2">
                    <div className="text-xs text-foreground/70 space-y-1">
                      <div className="flex justify-between">
                        <span>Products synced:</span>
                        <span className="font-medium text-[#00EC97]">
                          {syncProgressData.finalEvent.totalSynced}
                        </span>
                      </div>
                      {syncProgressData.finalEvent.totalFailed > 0 && (
                        <div className="flex justify-between">
                          <span>Failed:</span>
                          <span className="font-medium text-yellow-500">
                            {syncProgressData.finalEvent.totalFailed}
                          </span>
                        </div>
                      )}
                      {syncProgressData.finalEvent.totalRemoved > 0 && (
                        <div className="flex justify-between">
                          <span>Removed:</span>
                          <span className="font-medium text-foreground/50">
                            {syncProgressData.finalEvent.totalRemoved}
                          </span>
                        </div>
                      )}
                    </div>

                    {Object.keys(syncProgressData.finalEvent.providers).length >
                      0 && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-foreground/50 hover:text-foreground/70 transition-colors">
                          Provider details
                        </summary>
                        <div className="mt-2 space-y-1 pl-2 border-l-2 border-border/40">
                          {Object.entries(
                            syncProgressData.finalEvent.providers,
                          ).map(([name, p]) => (
                            <div
                              key={name}
                              className="flex justify-between text-foreground/70"
                            >
                              <span className="capitalize">{name}</span>
                              <span>
                                {p.synced} synced
                                {p.failed > 0 && `, ${p.failed} failed`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                )}
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
        {sorting.length === 0 && (
          <p className="mt-3 text-xs text-foreground/60 dark:text-muted-foreground">
            Default order shows the most recently synced or added products first.
          </p>
        )}
        {newlySyncedProductIds.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge className="border-[#00EC97]/40 bg-[#00EC97]/10 text-[#00EC97] hover:bg-[#00EC97]/10">
              {newlySyncedProductIds.length} new item
              {newlySyncedProductIds.length === 1 ? "" : "s"} pinned to top
            </Badge>
            <button
              type="button"
              onClick={() => setNewlySyncedProductIds([])}
              className="text-foreground/60 transition-colors hover:text-foreground"
            >
              Clear highlights
            </button>
          </div>
        )}
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
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-border/60">
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-foreground/70 dark:text-muted-foreground"
                  >
                    No products found
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "group transition-colors",
                      newlySyncedProductIdSet.has(row.original.id)
                        ? "bg-[#00EC97]/5 hover:bg-[#00EC97]/10"
                        : "hover:bg-background/40",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
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
              const isNewProduct = newlySyncedProductIdSet.has(product.id);
              return (
                <div
                  key={row.id}
                  className={cn(
                    "p-4 space-y-3 transition-colors max-w-full overflow-x-hidden",
                    isNewProduct
                      ? "bg-[#00EC97]/5 hover:bg-[#00EC97]/10"
                      : "hover:bg-background/40",
                  )}
                >
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
                        <p className="font-medium text-sm text-foreground/90 dark:text-muted-foreground truncate hover:text-[#00EC97] dark:hover:text-[#00EC97] transition-colors">
                          {product.title}
                        </p>
                      </Link>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {isNewProduct && (
                          <Badge className="border-[#00EC97]/40 bg-[#00EC97]/10 text-[#00EC97] hover:bg-[#00EC97]/10">
                            New
                          </Badge>
                        )}
                        {product.collections &&
                          product.collections.length > 0 && (
                            <Badge
                              variant="outline"
                              className="font-normal text-xs"
                            >
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
                        onClick={() =>
                          handleToggleListing(product.id, isListed)
                        }
                        disabled={updateListingMutation.isPending}
                        className={cn(
                          "h-8 px-2",
                          isListed
                            ? "text-[#00EC97] hover:text-[#00EC97] hover:bg-[#00EC97]/10"
                            : "text-foreground/50 dark:text-muted-foreground hover:text-foreground/70 dark:hover:text-muted-foreground hover:bg-background/40",
                        )}
                        title={
                          isListed
                            ? "Listed - Click to delist"
                            : "Delisted - Click to list"
                        }
                      >
                        {isListed ? (
                          <Eye className="size-4" />
                        ) : (
                          <EyeOff className="size-4" />
                        )}
                      </Button>
                      <span className="text-xs text-foreground/70 dark:text-muted-foreground">
                        {isListed ? "Listed" : "Delisted"}
                      </span>
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
            Showing {currentPageStart} to {currentPageEnd} of {filteredRowCount} products
          </p>
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground/90 dark:text-muted-foreground">
                Rows per page
              </span>
              <Select
                value={`${table.getState().pagination.pageSize}`}
                onValueChange={(value) => table.setPageSize(Number(value))}
              >
                <SelectTrigger className="h-9 w-[84px] border-border/60 bg-background/60">
                  <SelectValue placeholder={table.getState().pagination.pageSize} />
                </SelectTrigger>
                <SelectContent className="border-border/60">
                  {[10, 20, 50, 100].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
              Page {table.getState().pagination.pageIndex + 1} of{" "}
              {table.getPageCount()}
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
    </div>
  );
}
