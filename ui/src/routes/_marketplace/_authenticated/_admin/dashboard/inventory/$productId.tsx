import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ExternalLink, ImagePlus, Loader2, Star, Trash2, Upload, GripVertical } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useSuspenseProduct } from "@/integrations/api";
import { useUpdateProduct, useRequestAssetUpload, useConfirmAssetUpload } from "@/integrations/api/admin";
import { productKeys } from "@/integrations/api/keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute(
  "/_marketplace/_authenticated/_admin/dashboard/inventory/$productId",
)({
  pendingComponent: () => (
    <div className="flex items-center justify-center py-20">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97]" />
    </div>
  ),
  errorComponent: ({ error }: { error: Error }) => (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <p className="text-destructive font-semibold">Failed to load product</p>
      <p className="text-sm text-foreground/60">{error.message}</p>
      <Link to="/dashboard/inventory" className="text-[#00EC97] hover:underline text-sm">
        Back to Inventory
      </Link>
    </div>
  ),
  component: ProductEditPage,
});

type ImageType = "primary" | "mockup" | "preview" | "detail" | "catalog";

const IMAGE_TYPE_LABELS: Record<ImageType, string> = {
  primary: "Primary",
  mockup: "Mockup",
  preview: "Preview",
  detail: "Detail",
  catalog: "Catalog",
};

interface ProductImageDraft {
  id: string;
  url: string;
  type: ImageType;
  altText?: string;
  placement?: string;
  style?: string;
  variantIds?: string[];
  order: number;
  isNew?: boolean;
}

function ImageCard({
  img,
  index,
  isThumbnail,
  onSetThumbnail,
  onRemove,
}: {
  img: ProductImageDraft;
  index: number;
  isThumbnail: boolean;
  onSetThumbnail: () => void;
  onRemove: () => void;
}) {
  const { ref: draggableRef } = useDraggable({ id: img.id });
  const { ref: droppableRef } = useDroppable({ id: img.id });

  return (
    <div
      ref={(node) => {
        draggableRef(node);
        droppableRef(node);
      }}
      className={cn(
        "relative group rounded-lg overflow-hidden border-2 aspect-square cursor-grab active:cursor-grabbing",
        isThumbnail ? "border-[#00EC97]" : "border-border/60 hover:border-border",
      )}
    >
      <img
        src={img.url}
        alt={img.altText || `Product image ${index + 1}`}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSetThumbnail}
          className={cn(
            "p-1.5 rounded-md text-xs",
            isThumbnail
              ? "bg-[#00EC97] text-black"
              : "bg-white/90 text-foreground hover:bg-white",
          )}
          title={isThumbnail ? "Remove thumbnail" : "Set as thumbnail"}
        >
          <Star className="size-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-md bg-red-500/90 text-white hover:bg-red-500"
          title="Remove image"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-black/60 text-white">
        {IMAGE_TYPE_LABELS[img.type]}
      </div>
      <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="size-3.5 text-white/70" />
      </div>
    </div>
  );
}

function ProductEditPage() {
  const { productId } = Route.useParams();
  const { data } = useSuspenseProduct(productId);
  const product = data.product;
  const queryClient = useQueryClient();

  const [name, setName] = useState(product.title);
  const [description, setDescription] = useState(product.description ?? "");
  const [price, setPrice] = useState(String(product.price));
  const [images, setImages] = useState<ProductImageDraft[]>(
    (product.images ?? []).map((img, i) => ({
      id: img.id,
      url: img.url,
      type: (img.type || "catalog") as ImageType,
      altText: img.altText,
      placement: img.placement,
      style: img.style,
      variantIds: img.variantIds,
      order: img.order ?? i,
    })),
  );
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(
    product.thumbnailImage ?? null,
  );
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImageType, setNewImageType] = useState<ImageType>("primary");
  const [uploadingFile, setUploadingFile] = useState(false);
  const uploadTypeRef = useRef<ImageType>("primary");
  const [lastSavedHash, setLastSavedHash] = useState(() =>
    JSON.stringify({
      title: product.title,
      description: product.description ?? "",
      price: product.price,
      images: product.images ?? [],
      thumbnailImage: product.thumbnailImage ?? null,
    }),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateMutation = useUpdateProduct();
  const requestUpload = useRequestAssetUpload();
  const confirmUpload = useConfirmAssetUpload();

  const currentHash = JSON.stringify({
    title: name,
    description,
    price: Number(price) || 0,
    images,
    thumbnailImage,
  });
  const hasUnsavedChanges = currentHash !== lastSavedHash;

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const handleRemoveImage = useCallback((index: number) => {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.map((img, i) => ({ ...img, order: i }));
    });
  }, []);

  const handleSetThumbnail = useCallback((url: string) => {
    setThumbnailImage((prev) => (prev === url ? null : url));
  }, []);

  const handleAddImageUrl = useCallback(() => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [
      ...prev,
      {
        id: `new-img-${Date.now()}`,
        url: newImageUrl.trim(),
        type: newImageType,
        order: prev.length,
        isNew: true,
      },
    ]);
    setNewImageUrl("");
  }, [newImageUrl, newImageType]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large", { description: "Maximum file size is 10 MB" });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file type", { description: "Please upload an image file" });
        return;
      }

      setUploadingFile(true);
      try {
        const uploadReq = await requestUpload.mutateAsync({
          filename: file.name,
          contentType: file.type,
        });

        const putRes = await fetch(uploadReq.presignedUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          throw new Error(`Upload failed: ${putRes.status}`);
        }

        await confirmUpload.mutateAsync({
          key: uploadReq.key,
          publicUrl: uploadReq.publicUrl,
          assetId: uploadReq.assetId,
          filename: file.name,
          contentType: file.type,
          size: file.size,
        });

        setImages((prev) => [
          ...prev,
          {
            id: `new-img-${Date.now()}`,
            url: uploadReq.publicUrl,
            type: uploadTypeRef.current,
            order: prev.length,
            isNew: true,
          },
        ]);
      } catch (err) {
        toast.error("Image upload failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [requestUpload, confirmUpload],
  );

  const handleChangeImageType = useCallback((index: number, type: ImageType) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, type } : img)),
    );
  }, []);

  const handleSave = useCallback(() => {
    const parsedPrice = Number(price);
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error("Price must be a positive number");
      return;
    }

    updateMutation.mutate(
      {
        id: productId,
        name: name !== product.title ? name : undefined,
        description: description !== (product.description ?? "") ? description : undefined,
        price: parsedPrice !== product.price ? parsedPrice : undefined,
        images: images.map((img, i) => ({
          id: img.id,
          url: img.url,
          type: img.type,
          altText: img.altText,
          placement: img.placement,
          style: img.style,
          variantIds: img.variantIds,
          order: i,
        })),
        thumbnailImage: thumbnailImage !== (product.thumbnailImage ?? null) ? thumbnailImage : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Product updated");
          setLastSavedHash(
            JSON.stringify({
              title: name,
              description,
              price: parsedPrice,
              images,
              thumbnailImage,
            }),
          );
          queryClient.invalidateQueries({ queryKey: productKeys.all });
        },
      },
    );
  }, [updateMutation, productId, name, description, price, images, thumbnailImage, product, queryClient]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/dashboard/inventory"
            className="inline-flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            Inventory
          </Link>
          <a
            href={`/products/${product.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-foreground/50 hover:text-foreground transition-colors"
          >
            <ExternalLink className="size-3.5" />
            View on site
          </a>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="text-xs text-foreground/50">Unsaved changes</span>
          )}
          <Button
            onClick={handleSave}
            disabled={updateMutation.isPending || !hasUnsavedChanges}
            className={cn(
              "font-semibold",
              hasUnsavedChanges
                ? "bg-[#00EC97] text-black hover:bg-[#00d97f]"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            )}
          >
            {updateMutation.isPending && <Loader2 className="size-4 animate-spin mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Edit Product</h2>
        <p className="text-sm text-foreground/60 mt-1">{product.slug}</p>
      </div>

      {/* Basic Details */}
      <div className="rounded-2xl bg-background border border-border/60 p-6 space-y-4">
        <h3 className="text-sm font-medium text-foreground/90">Details</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-2 w-40">
            <Label htmlFor="price">Price (USD)</Label>
            <Input id="price" type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Images */}
      <div className="rounded-2xl bg-background border border-border/60 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground/90">Images</h3>
          <p className="text-xs text-foreground/50">Drag to reorder</p>
        </div>

        <DragDropProvider
          onDragEnd={(event) => {
            const sourceId = event.operation?.source?.id;
            const targetId = event.operation?.target?.id;
            if (!sourceId || !targetId || sourceId === targetId) return;
            setImages((prev) => {
              const sourceIndex = prev.findIndex((img) => img.id === sourceId);
              const targetIndex = prev.findIndex((img) => img.id === targetId);
              if (sourceIndex === -1 || targetIndex === -1) return prev;
              const next = [...prev];
              const [moved] = next.splice(sourceIndex, 1);
              next.splice(targetIndex, 0, moved);
              return next.map((img, i) => ({ ...img, order: i }));
            });
          }}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((img, index) => (
              <ImageCard
                key={img.id}
                img={img}
                index={index}
                isThumbnail={thumbnailImage === img.url}
                onSetThumbnail={() => handleSetThumbnail(img.url)}
                onRemove={() => handleRemoveImage(index)}
              />
            ))}
            <DragOverlay dropAnimation={{ duration: 180, easing: "ease-out" }}>
              {() => null}
            </DragOverlay>

            {/* Add image card */}
            <div className="rounded-lg border-2 border-dashed border-border/60 aspect-square flex flex-col items-center justify-center gap-2 text-foreground/40 hover:text-foreground/70 hover:border-foreground/30 transition-colors">
              <label className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="size-5" />
                <span className="text-xs">Upload</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                />
              </label>
              {uploadingFile && <Loader2 className="size-4 animate-spin text-foreground/50" />}
            </div>
          </div>
        </DragDropProvider>

        {thumbnailImage && (
          <p className="text-xs text-foreground/60 flex items-center gap-1">
            <Star className="size-3 text-[#00EC97]" /> Thumbnail set
          </p>
        )}

        {/* Image type editor */}
        {images.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-foreground/50">Change image type:</p>
            <div className="flex flex-wrap gap-2">
              {images.map((img, index) => (
                <div key={img.id} className="flex items-center gap-1.5">
                  <span className="text-xs text-foreground/60 truncate max-w-[120px]">
                    {img.url.split("/").pop()}
                  </span>
                  <Select
                    value={img.type}
                    onValueChange={(val: ImageType) => handleChangeImageType(index, val)}
                  >
                    <SelectTrigger className="h-7 w-24 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(IMAGE_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value} className="text-xs">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add by URL */}
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="imageUrl">Add image by URL</Label>
            <Input
              id="imageUrl"
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="https://example.com/image.png"
              onKeyDown={(e) => e.key === "Enter" && handleAddImageUrl()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="imageType">Type</Label>
            <Select value={newImageType} onValueChange={(val: ImageType) => setNewImageType(val)}>
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(IMAGE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="button" onClick={handleAddImageUrl} variant="outline" className="h-9">
            <ImagePlus className="size-4 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}