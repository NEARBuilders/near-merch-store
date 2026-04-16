// @ts-nocheck
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Package,
  Search,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useBrowseCatalog,
  useCatalogProduct,
  useCatalogVariants,
  useAssets,
  useCreateAsset,
  useBuildProduct,
} from "@/integrations/api/admin";

export const Route = createFileRoute(
  "/_marketplace/_authenticated/_admin/dashboard/new-product" as const,
)({
  component: NewProductPage,
});

type Step = "provider" | "catalog" | "assets" | "variants" | "details";

const STEPS: { id: Step; label: string }[] = [
  { id: "provider", label: "Provider" },
  { id: "catalog", label: "Catalog" },
  { id: "assets", label: "Assets" },
  { id: "variants", label: "Variants" },
  { id: "details", label: "Details" },
];

const STEP_INDEX: Record<Step, number> = {
  provider: 0,
  catalog: 1,
  assets: 2,
  variants: 3,
  details: 4,
};

function NewProductPage() {
  const navigate = useNavigate();
  const buildMutation = useBuildProduct();
  const createAssetMutation = useCreateAsset();

  const [step, setStep] = useState<Step>("provider");
  const [providerName, setProviderName] = useState<string>("");
  const [catalogProductId, setCatalogProductId] = useState<string>("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedVariantIds, setSelectedVariantIds] = useState<Set<string>>(
    new Set(),
  );
  const [files, setFiles] = useState<
    Array<{ assetId: string; url: string; slot?: string }>
  >([]);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productImage, setProductImage] = useState("");
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [assetUrlInput, setAssetUrlInput] = useState("");
  const [assetTypeInput, setAssetTypeInput] = useState("image");

  const currentStepIndex = STEP_INDEX[step];

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) setStep(STEPS[nextIndex]!.id);
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) setStep(STEPS[prevIndex]!.id);
  };

  const canProceed = (): boolean => {
    switch (step) {
      case "provider":
        return !!providerName;
      case "catalog":
        return !!catalogProductId;
      case "assets":
        return files.length > 0;
      case "variants":
        return selectedVariantIds.size > 0;
      case "details":
        return !!productName.trim();
      default:
        return false;
    }
  };

  const handleBuild = () => {
    const selectedVariants = Array.from(selectedVariantIds);

    const variants = selectedVariants.map((variantRef) => ({
      name: variantRef,
      variantRef,
      providerConfig: {
        catalogProductId,
        catalogVariantId: variantRef,
      } as Record<string, unknown>,
    }));

    buildMutation.mutate(
      {
        name: productName.trim(),
        description: productDescription.trim() || undefined,
        providerName: providerName,
        image: productImage.trim() || undefined,
        variants,
        files: files.map((f) => ({
          assetId: f.assetId,
          url: f.url,
          slot: f.slot,
        })),
        priceOverride: priceOverride ? parseFloat(priceOverride) : undefined,
        currency: "USD",
      },
      {
        onSuccess: () => {
          navigate({ to: "/dashboard/inventory" });
        },
      },
    );
  };

  const handleAddAsset = async () => {
    if (!assetUrlInput.trim()) return;
    try {
      const result = await createAssetMutation.mutateAsync({
        url: assetUrlInput.trim(),
        type: assetTypeInput,
      });
      setFiles((prev) => [
        ...prev,
        { assetId: result.id, url: result.url, slot: undefined },
      ]);
      setAssetUrlInput("");
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate({ to: "/dashboard/inventory" })}
          className="gap-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Create Product</h2>
          <p className="text-sm text-foreground/90 dark:text-muted-foreground">
            Build a new product from a provider catalog
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const isActive = s.id === step;
          const isCompleted = STEP_INDEX[s.id] < currentStepIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (isCompleted) setStep(s.id);
              }}
              disabled={!isCompleted && !isActive}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                isActive && "bg-[#00EC97] text-black",
                isCompleted && "bg-[#00EC97]/10 text-[#00EC97] hover:bg-[#00EC97]/20",
                !isActive && !isCompleted && "bg-background border border-border/60 text-foreground/50 cursor-not-allowed",
              )}
            >
              {isCompleted ? (
                <Check className="size-4" />
              ) : (
                <span className="size-4 flex items-center justify-center rounded-full border border-current text-xs">
                  {i + 1}
                </span>
              )}
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-2xl bg-background border border-border/60 p-6">
        {step === "provider" && (
          <ProviderStep providerName={providerName} onSelect={setProviderName} />
        )}
        {step === "catalog" && (
          <CatalogStep
            providerName={providerName}
            catalogProductId={catalogProductId}
            catalogSearch={catalogSearch}
            onSelectProduct={setCatalogProductId}
            onSearchChange={setCatalogSearch}
          />
        )}
        {step === "assets" && (
          <AssetsStep
            files={files}
            assetUrlInput={assetUrlInput}
            assetTypeInput={assetTypeInput}
            onAssetUrlChange={setAssetUrlInput}
            onAssetTypeChange={setAssetTypeInput}
            onAddAsset={handleAddAsset}
            onRemoveAsset={(idx) =>
              setFiles((prev) => prev.filter((_, i) => i !== idx))
            }
            onSlotChange={(idx, slot) =>
              setFiles((prev) =>
                prev.map((f, i) => (i === idx ? { ...f, slot } : f)),
              )
            }
            isCreating={createAssetMutation.isPending}
          />
        )}
        {step === "variants" && (
          <VariantsStep
            providerName={providerName}
            catalogProductId={catalogProductId}
            selectedVariantIds={selectedVariantIds}
            onToggleVariant={(id) =>
              setSelectedVariantIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onSelectAll={(ids) => setSelectedVariantIds(new Set(ids))}
            onClearAll={() => setSelectedVariantIds(new Set())}
          />
        )}
        {step === "details" && (
          <DetailsStep
            productName={productName}
            productDescription={productDescription}
            productImage={productImage}
            priceOverride={priceOverride}
            onNameChange={setProductName}
            onDescriptionChange={setProductDescription}
            onImageChange={setProductImage}
            onPriceChange={setPriceOverride}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={goBack} disabled={currentStepIndex === 0}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
        {step === "details" ? (
          <Button
            onClick={handleBuild}
            disabled={!canProceed() || buildMutation.isPending}
            className="bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            {buildMutation.isPending ? (
              <Loader2 className="size-4 mr-2 animate-spin" />
            ) : (
              <Check className="size-4 mr-2" />
            )}
            Create Product
          </Button>
        ) : (
          <Button
            onClick={goNext}
            disabled={!canProceed()}
            className="bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            Next
            <ArrowRight className="size-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

function ProviderStep({
  providerName,
  onSelect,
}: {
  providerName: string;
  onSelect: (name: string) => void;
}) {
  const providers = [
    {
      id: "printful",
      name: "Printful",
      description: "Apparel, accessories, homeware — DTG, embroidery, and more",
    },
    {
      id: "lulu",
      name: "Lulu",
      description: "Books, prints, and publications — perfect-bound and hardcover",
    },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose a Provider</h3>
      <p className="text-sm text-foreground/70 dark:text-muted-foreground">
        Select the fulfillment provider for your product.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              providerName === p.id
                ? "border-[#00EC97] bg-[#00EC97]/5"
                : "border-border/60 hover:border-[#00EC97]/40",
            )}
          >
            <p className="font-semibold">{p.name}</p>
            <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-1">
              {p.description}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function CatalogStep({
  providerName,
  catalogProductId,
  catalogSearch,
  onSelectProduct,
  onSearchChange,
}: {
  providerName: string;
  catalogProductId: string;
  catalogSearch: string;
  onSelectProduct: (id: string) => void;
  onSearchChange: (q: string) => void;
}) {
  const { data: catalogData, isLoading } = useBrowseCatalog(providerName, {
    limit: 50,
    enabled: !!providerName,
  });
  const products = catalogData?.products ?? [];

  const filtered = catalogSearch
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
          p.brand?.toLowerCase().includes(catalogSearch.toLowerCase()),
      )
    : products;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Choose a Catalog Product</h3>
      <p className="text-sm text-foreground/70 dark:text-muted-foreground">
        Select the base product (blank) from the {providerName} catalog.
      </p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-foreground/50 dark:text-muted-foreground" />
        <Input
          placeholder="Search catalog..."
          value={catalogSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:border-[#00EC97]"
        />
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[#00EC97]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-foreground/70 dark:text-muted-foreground">
          No catalog products found
        </div>
      ) : (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectProduct(p.id)}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                catalogProductId === p.id
                  ? "border-[#00EC97] bg-[#00EC97]/5"
                  : "border-border/60 hover:border-[#00EC97]/40",
              )}
            >
              {p.image ? (
                <img src={p.image} alt={p.name} className="size-10 rounded object-cover bg-muted" />
              ) : (
                <div className="size-10 rounded bg-muted flex items-center justify-center">
                  <Package className="size-4 text-foreground/50" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.name}</p>
                {p.brand && (
                  <p className="text-xs text-foreground/60 dark:text-muted-foreground truncate">
                    {p.brand}
                  </p>
                )}
              </div>
              {p.variants && (
                <Badge variant="outline" className="font-normal text-xs shrink-0">
                  {p.variants.length} variants
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function AssetsStep({
  files,
  assetUrlInput,
  assetTypeInput,
  onAssetUrlChange,
  onAssetTypeChange,
  onAddAsset,
  onRemoveAsset,
  onSlotChange,
  isCreating,
}: {
  files: Array<{ assetId: string; url: string; slot?: string }>;
  assetUrlInput: string;
  assetTypeInput: string;
  onAssetUrlChange: (v: string) => void;
  onAssetTypeChange: (v: string) => void;
  onAddAsset: () => void;
  onRemoveAsset: (idx: number) => void;
  onSlotChange: (idx: number, slot: string) => void;
  isCreating: boolean;
}) {
  const { data: assetsData } = useAssets({ limit: 50 });
  const existingAssets = assetsData?.assets ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Add Assets</h3>
      <p className="text-sm text-foreground/70 dark:text-muted-foreground">
        Upload or select design assets that will be applied to the product. For Printful, use slot names like &quot;default&quot;, &quot;back&quot;, etc.
      </p>

      <div className="rounded-xl border border-border/60 p-4 space-y-3">
        <Label className="text-sm font-medium">Add by URL</Label>
        <div className="flex gap-2">
          <Input
            placeholder="https://example.com/design.png"
            value={assetUrlInput}
            onChange={(e) => onAssetUrlChange(e.target.value)}
            className="flex-1 bg-background/60 border border-border/60 rounded-lg"
          />
          <select
            value={assetTypeInput}
            onChange={(e) => onAssetTypeChange(e.target.value)}
            className="h-9 rounded-lg border border-border/60 bg-background/60 px-3 text-sm"
          >
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
          </select>
          <Button
            type="button"
            onClick={onAddAsset}
            disabled={!assetUrlInput.trim() || isCreating}
            className="bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
            Add
          </Button>
        </div>
      </div>

      {existingAssets.length > 0 && (
        <div className="rounded-xl border border-border/60 p-4 space-y-3">
          <Label className="text-sm font-medium">Use Existing Asset</Label>
          <div className="grid gap-2 max-h-48 overflow-y-auto">
            {existingAssets.map((asset) => {
              const alreadyAdded = files.some((f) => f.assetId === asset.id);
              return (
                <button
                  key={asset.id}
                  type="button"
                  disabled={alreadyAdded}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2 text-left text-sm transition-colors",
                    alreadyAdded
                      ? "border-[#00EC97]/40 bg-[#00EC97]/5 opacity-60 cursor-not-allowed"
                      : "border-border/60 hover:border-[#00EC97]/40",
                  )}
                >
                  {asset.url && (
                    <img src={asset.url} alt={asset.name || "Asset"} className="size-8 rounded object-cover bg-muted" />
                  )}
                  <span className="truncate flex-1">{asset.name || asset.url}</span>
                  <Badge variant="outline" className="font-normal text-xs">{asset.type}</Badge>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Selected Files ({files.length})</Label>
          <div className="space-y-2">
            {files.map((f, idx) => (
              <div key={f.assetId} className="flex items-center gap-2 rounded-lg border border-border/60 p-2">
                <img src={f.url} alt="" className="size-10 rounded object-cover bg-muted" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate text-foreground/80">{f.url}</p>
                  <Input
                    placeholder="Slot (e.g. default, back)"
                    value={f.slot || ""}
                    onChange={(e) => onSlotChange(idx, e.target.value)}
                    className="h-6 text-xs bg-background/60 border border-border/60 rounded"
                  />
                </div>
                <button type="button" onClick={() => onRemoveAsset(idx)} className="text-foreground/50 hover:text-red-500 transition-colors">
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VariantsStep({
  providerName,
  catalogProductId,
  selectedVariantIds,
  onToggleVariant,
  onSelectAll,
  onClearAll,
}: {
  providerName: string;
  catalogProductId: string;
  selectedVariantIds: Set<string>;
  onToggleVariant: (id: string) => void;
  onSelectAll: (ids: string[]) => void;
  onClearAll: () => void;
}) {
  const { data: productData } = useCatalogProduct(providerName, catalogProductId, { enabled: !!catalogProductId });
  const { data: variantsData, isLoading } = useCatalogVariants(providerName, catalogProductId, { enabled: !!catalogProductId });

  const variants = variantsData?.variants ?? [];
  const productName = productData?.product?.name ?? catalogProductId;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Select Variants</h3>
      <p className="text-sm text-foreground/70 dark:text-muted-foreground">
        Choose which variants of &quot;{productName}&quot; to include in your product.
      </p>

      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onSelectAll(variants.map((v) => v.id))} className="text-xs">
          Select All
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onClearAll} className="text-xs">
          Clear All
        </Button>
        <Badge variant="outline" className="font-normal text-xs h-7 flex items-center">
          {selectedVariantIds.size} of {variants.length} selected
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-[#00EC97]" />
        </div>
      ) : variants.length === 0 ? (
        <div className="text-center py-12 text-sm text-foreground/70 dark:text-muted-foreground">
          No variants found
        </div>
      ) : (
        <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-1">
          {variants.map((v) => {
            const isSelected = selectedVariantIds.has(v.id);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onToggleVariant(v.id)}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                  isSelected
                    ? "border-[#00EC97] bg-[#00EC97]/5"
                    : "border-border/60 hover:border-[#00EC97]/40",
                )}
              >
                {v.image ? (
                  <img src={v.image} alt={v.name} className="size-10 rounded object-cover bg-muted" />
                ) : (
                  <div className="size-10 rounded bg-muted flex items-center justify-center">
                    <Package className="size-4 text-foreground/50" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.name}</p>
                  <div className="flex gap-2 mt-0.5">
                    {v.size && <Badge variant="outline" className="font-normal text-xs">{v.size}</Badge>}
                    {v.color && <Badge variant="outline" className="font-normal text-xs">{v.color}</Badge>}
                  </div>
                </div>
                {v.price?.retail != null && (
                  <span className="text-sm text-foreground/70">${v.price.retail.toFixed(2)}</span>
                )}
                <div
                  className={cn(
                    "size-5 rounded border flex items-center justify-center transition-colors",
                    isSelected ? "border-[#00EC97] bg-[#00EC97] text-black" : "border-border/60",
                  )}
                >
                  {isSelected && <Check className="size-3" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DetailsStep({
  productName,
  productDescription,
  productImage,
  priceOverride,
  onNameChange,
  onDescriptionChange,
  onImageChange,
  onPriceChange,
}: {
  productName: string;
  productDescription: string;
  productImage: string;
  priceOverride: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onImageChange: (v: string) => void;
  onPriceChange: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Product Details</h3>
      <p className="text-sm text-foreground/70 dark:text-muted-foreground">
        Set the name, description, and optional overrides for your product.
      </p>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label>Product Name *</Label>
          <Input
            placeholder="My Product"
            value={productName}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:border-[#00EC97]"
          />
        </div>

        <div className="space-y-2">
          <Label>Description</Label>
          <textarea
            placeholder="Product description..."
            value={productDescription}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm focus:border-[#00EC97] focus:outline-none focus:ring-0 resize-none"
          />
        </div>

        <div className="space-y-2">
          <Label>Image URL</Label>
          <Input
            placeholder="https://example.com/product-image.jpg"
            value={productImage}
            onChange={(e) => onImageChange(e.target.value)}
            className="bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:border-[#00EC97]"
          />
        </div>

        <div className="space-y-2">
          <Label>Price Override (optional)</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="Leave blank to use catalog pricing"
            value={priceOverride}
            onChange={(e) => onPriceChange(e.target.value)}
            className="bg-background/60 border border-border/60 rounded-lg focus-visible:ring-0 focus-visible:border-[#00EC97]"
          />
          <p className="text-xs text-foreground/50">
            Override the default retail price. Leave blank to use the provider&apos;s catalog price.
          </p>
        </div>
      </div>
    </div>
  );
}