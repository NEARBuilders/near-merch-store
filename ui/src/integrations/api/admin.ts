import { apiClient } from "@/utils/orpc";
import { useMutation, useQuery } from "@tanstack/react-query";
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

export function useBrowseCatalog(
  provider: string,
  options?: { limit?: number; offset?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: catalogKeys.list(provider, options),
    queryFn: () =>
      apiClient.browseProviderCatalog({
        provider: provider as "printful" | "lulu",
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      }),
    enabled: options?.enabled !== false && !!provider,
  });
}

export function useCatalogProduct(
  provider: string,
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: catalogKeys.detail(provider, id),
    queryFn: () => apiClient.getProviderCatalogProduct({ provider: provider as "printful" | "lulu", id }),
    enabled: options?.enabled !== false && !!provider && !!id,
  });
}

export function useCatalogVariants(
  provider: string,
  id: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: catalogKeys.variants(provider, id),
    queryFn: () => apiClient.getProviderCatalogVariants({ provider: provider as "printful" | "lulu", id }),
    enabled: options?.enabled !== false && !!provider && !!id,
  });
}

export function useAssets(options?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: assetKeys.list(options),
    queryFn: () =>
      apiClient.listAssets({
        type: options?.type,
        limit: options?.limit ?? 50,
        offset: options?.offset ?? 0,
      }),
  });
}

export function useCreateAsset() {
  return useMutation({
    mutationFn: async (input: { url: string; type: string; name?: string }) => {
      return await apiClient.createAsset(input);
    },
    onError: (error) => {
      toast.error("Failed to create asset", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useBuildProduct() {
  return useMutation({
    mutationFn: async (input: Parameters<typeof apiClient.buildProduct>[0]) => {
      return await apiClient.buildProduct(input);
    },
    onSuccess: () => {
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create product", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

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

export function useRequestAssetUpload() {
  return useMutation({
    mutationFn: async (input: { filename: string; contentType: string; prefix?: string }) => {
      return await apiClient.requestAssetUpload(input);
    },
    onError: (error) => {
      toast.error("Failed to request upload", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useConfirmAssetUpload() {
  return useMutation({
    mutationFn: async (input: {
      key: string;
      publicUrl: string;
      assetId: string;
      filename?: string;
      contentType?: string;
      size?: number;
    }) => {
      return await apiClient.confirmAssetUpload(input);
    },
    onError: (error) => {
      toast.error("Failed to confirm upload", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}

export function useGetPlacements(
  provider: string,
  catalogProductId: string,
  options?: { enabled?: boolean },
) {
  const placementKeys = {
    detail: (p: string, id: string) => ["placements", p, id] as const,
  };
  return useQuery({
    queryKey: placementKeys.detail(provider, catalogProductId),
    queryFn: () =>
      apiClient.getProviderPlacements({
        provider: provider as "printful" | "lulu",
        catalogProductId,
      }),
    enabled: options?.enabled !== false && !!provider && !!catalogProductId,
  });
}

export function useGenerateProductMockups() {
  return useMutation({
    mutationFn: async (input: { id: string; styleIds?: number[] }) => {
      return await apiClient.generateProductMockups(input);
    },
    onSuccess: () => {
      toast.success("Mockup generation started");
    },
    onError: (error) => {
      toast.error("Failed to generate mockups", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
}
