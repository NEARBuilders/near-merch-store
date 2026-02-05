import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCategories, useCreateCategory, useDeleteCategory } from "@/integrations/api";

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
  const { data, isLoading } = useCategories();
  const collections = data?.categories ?? [];

  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();

  const [name, setName] = useState("");
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
            onClick={() => createMutation.mutate({ name: name.trim(), slug: autoSlug })}
          >
            Create
          </Button>
        </div>

        {createMutation.isError && (
          <div className="text-sm text-red-500">
            Failed to create collection.
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-background border border-border/60 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00EC97] mx-auto mb-2"></div>
              <p className="text-sm text-foreground/90 dark:text-muted-foreground">Loading collections...</p>
            </div>
          </div>
        ) : collections.length === 0 ? (
          <div className="text-sm text-foreground/70 dark:text-muted-foreground">
            No collections yet.
          </div>
        ) : (
          <div className="space-y-2">
            {collections.map((c) => (
              <div
                key={c.slug}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <Badge variant="outline" className="font-normal">
                      {c.slug}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className={cn("shrink-0", "hover:border-red-500/60 hover:text-red-500")}
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: c.slug })}
                >
                  Delete
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

