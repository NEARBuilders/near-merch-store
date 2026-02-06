import React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCollections, useCreateCollection, useDeleteCollection, useUpdateCollection, useSuspenseCollection, useUpdateCollectionFeaturedProduct, type Collection } from "@/integrations/api";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronRight, X, Search, Package } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export const Route = createFileRoute("/_marketplace/_authenticated/_admin/dashboard/collections")({
  component: AdminCollections,
});

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function AdminCollections() {
  const { data: collectionsData, isLoading } = useCollections();
  const collections = collectionsData?.collections ?? [];

  const createMutation = useCreateCollection();
  const deleteMutation = useDeleteCollection();
  const updateMutation = useUpdateCollection();
  const updateFeaturedMutation = useUpdateCollectionFeaturedProduct();

  const [name, setName] = useState("");
  const [editCollection, setEditCollection] = useState<Collection | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: expandedCollectionData } = useSuspenseCollection(expandedRow ?? '');
  const productsInCollection = useMemo(() => {
    if (!expandedRow || !expandedCollectionData?.products || expandedRow === '') return [];

    return [...expandedCollectionData.products].sort((a, b) => {
      const aFeatured = a.featured === true ? 0 : 1;
      const bFeatured = b.featured === true ? 0 : 1;

      if (aFeatured !== bFeatured) {
        return aFeatured - bFeatured;
      }

      return a.title.localeCompare(b.title);
    });
  }, [expandedRow, expandedCollectionData?.products]);

  const handleExpandRow = (slug: string, collection: Collection) => {
    setExpandedRow(expandedRow === slug ? null : slug);
    setEditCollection(collection);
  };

  const handleCreate = () => {
    if (name.trim()) {
      const autoSlug = slugify(name);
      createMutation.mutate({ name: name.trim(), slug: autoSlug }, {
        onSuccess: () => {
          setName("");
        }
      });
    }
  };

  const autoSlug = useMemo(() => slugify(name), [name]);

  const canCreate = name.trim().length > 0 && autoSlug.length > 0 && !createMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">Collections</h2>
        <p className="text-sm text-foreground/90 dark:text-muted-foreground">
          Create and manage product collections (e.g. Exclusives, Legion Merch Collection).
          Products can belong to multiple collections.
        </p>
      </div>

      <div className="rounded-2xl bg-background border border-border/60 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
          <div className="space-y-1">
            <div className="text-sm font-medium">Name</div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Exclusives"
            />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-medium">Slug</div>
            <Input value={autoSlug} readOnly />
          </div>
          <Button
            disabled={!canCreate}
            onClick={handleCreate}
            className="bg-[#00EC97] text-black hover:bg-[#00d97f]"
          >
            Create
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
            <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading collections...</p>
          </div>
        </div>
      ) : collections.length === 0 ? (
        <div className="rounded-2xl bg-background border border-border/60 p-12 text-center">
          <Package className="mx-auto h-12 w-12 text-foreground/50 dark:text-muted-foreground mb-4" />
          <p className="text-foreground/90 dark:text-muted-foreground font-medium">No collections yet</p>
          <p className="text-sm text-foreground/70 dark:text-muted-foreground mt-1">
            Create your first collection using the form above
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-background border border-border/60 overflow-hidden">
          <table className="w-full">
            <thead className="bg-background/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Carousel Visible</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {collections.map((collection) => (
                <React.Fragment key={collection.slug}>
                  <tr className="group hover:bg-background/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleExpandRow(collection.slug, collection)}
                        >
                          {expandedRow === collection.slug ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </Button>
                        <span className="font-medium">{collection.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground/70 dark:text-muted-foreground truncate max-w-[200px] block">
                        {collection.description || 'No description'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={collection.showInCarousel ? "default" : "outline"} className="font-normal text-xs">
                        {collection.showInCarousel ? 'Visible' : 'Hidden'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-foreground/70 dark:text-muted-foreground">{collection.carouselOrder ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        className={cn("bg-destructive text-destructive-foreground hover:bg-destructive/90")}
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ id: collection.slug })}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                  {expandedRow === collection.slug && (
                    <tr>
                      <td colSpan={5} className="p-4 bg-background/30">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              value={editCollection?.description ?? ""}
                              onChange={(e) => setEditCollection(prev => prev ? { ...prev, description: e.target.value } : null)}
                              placeholder="Collection description"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Carousel Title</Label>
                            <Input
                              value={editCollection?.carouselTitle ?? ""}
                              onChange={(e) => setEditCollection(prev => prev ? { ...prev, carouselTitle: e.target.value } : null)}
                              placeholder="Title shown in carousel"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Carousel Description</Label>
                            <Input
                              value={editCollection?.carouselDescription ?? ""}
                              onChange={(e) => setEditCollection(prev => prev ? { ...prev, carouselDescription: e.target.value } : null)}
                              placeholder="Description shown in carousel"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Carousel Order</Label>
                            <Input
                              type="number"
                              value={editCollection?.carouselOrder ?? 0}
                              onChange={(e) => setEditCollection(prev => prev ? { ...prev, carouselOrder: Number(e.target.value) } : null)}
                            />
                            <p className="text-xs text-foreground/60 dark:text-muted-foreground">
                              Lower numbers appear first in the carousel
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editCollection?.showInCarousel ?? true}
                                onChange={(e) => setEditCollection(prev => prev ? { ...prev, showInCarousel: e.target.checked } : null)}
                                className="rounded"
                              />
                              <span className="text-sm font-medium">Show in carousel</span>
                            </label>
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label>Featured Product</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-3 px-3 py-2 border border-border/60 rounded-lg hover:border-[#00EC97] bg-background/60 text-left text-sm"
                                >
                                  {editCollection?.featuredProduct ? (
                                    <>
                                      <img
                                        src={editCollection.featuredProduct.thumbnailImage || ''}
                                        alt=""
                                        className="size-8 rounded object-cover"
                                      />
                                      <span className="truncate flex-1">{editCollection.featuredProduct.title}</span>
                                      <span className="text-xs text-foreground/50">
                                        ${editCollection.featuredProduct.price.toFixed(2)}
                                      </span>
                                      <X
                                        className="size-4 text-foreground/50 hover:text-red-500"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateFeaturedMutation.mutate({ slug: editCollection.slug, productId: '' });
                                        }}
                                      />
                                    </>
                                  ) : (
                                    <>
                                      <Search className="size-4 text-foreground/50" />
                                      <span className="text-foreground/50">Select featured product...</span>
                                    </>
                                  )}
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-80 p-0" side="bottom">
                                <Command className="rounded-lg border-0 shadow-md">
                                  <CommandInput placeholder="Search products..." />
                                  <CommandList>
                                    <CommandEmpty>No products found</CommandEmpty>
                                    <CommandGroup>
                                      {productsInCollection.map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={`${product.title} ${product.id}`}
                                          onSelect={() => {
                                            updateFeaturedMutation.mutate({ slug: editCollection!.slug, productId: product.id });
                                          }}
                                          className="flex items-center gap-2"
                                        >
                                          {product.featured && (
                                            <div className="text-[#00EC97] text-xs font-semibold">★</div>
                                          )}
                                          <img
                                            src={product.thumbnailImage || ''}
                                            alt=""
                                            className="size-6 rounded object-cover"
                                          />
                                          <span className="truncate flex-1">{product.title}</span>
                                          <span className="text-xs text-foreground/70">${product.price.toFixed(2)}</span>
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <p className="text-xs text-foreground/60">
                              Featured products shown first. Featured collection product appears in carousel.
                            </p>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setExpandedRow(null);
                                setEditCollection(null);
                              }}
                              className="text-foreground/50 dark:text-muted-foreground"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => {
                                if (editCollection) {
                                  updateMutation.mutate(
                                    { 
                                      slug: editCollection.slug, 
                                      name: editCollection.name, 
                                      description: editCollection.description, 
                                      carouselTitle: editCollection.carouselTitle, 
                                      carouselDescription: editCollection.carouselDescription, 
                                      showInCarousel: editCollection.showInCarousel, 
                                      carouselOrder: editCollection.carouselOrder 
                                    },
                                    {
                                      onSuccess: () => {
                                        setEditCollection(null);
                                        setExpandedRow(null);
                                      }
                                    }
                                  );
                                }
                              }}
                              disabled={updateMutation.isPending}
                              className="bg-[#00EC97] text-black hover:bg-[#00d97f]"
                            >
                              Save Changes
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}