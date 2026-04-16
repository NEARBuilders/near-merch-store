import { apiClient } from "@/utils/orpc";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

const catalogKeys = {
  all: ["catalog"] as const,
  list: (provider: string, options?: { limit?: number; offset?: number }) =>
    [...catalogKeys.all, provider, options] as const,
  detail: (provider: string, id: string) =>
    [...catalogKeys.all, provider, "detail", id] as const,
  variants: (provider: string, id: string) =>
    [...catalogKeys.all, provider, id, "variants"] as const,
};

const assetKeys = {
  all: ["assets"] as const,
  list: (options?: { type?: string; limit?: number; offset?: number }) =>
    [...assetKeys.all, options] as const,
};

export function useRunMigration() {
  return useMutation({
    mutationFn: async () => {
      return await apiClient.migrate();
    },
    onSuccess: (result) => {
      toast.success("Migration complete", {
        description: `${result.variantsMigrated} variants migrated, ${result.assetsCreated} assets created, ${result.luluBooksSeeded} Lulu books seeded`,
        duration: 8000,
      });
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} migration errors`, {
          description: result.errors.map((e) => e.error).join(", ").slice(0, 200),
          duration: 10000,
        });
      }
    },
    onError: (error) => {
      toast.error("Migration failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
