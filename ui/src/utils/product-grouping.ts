import type { Product } from "@/integrations/api";

/**
 * Groups a flat list of products by their groupId.
 * Merges variants and images for products within the same group.
 */
export function groupProductsByGroupId(products: Product[]): Product[] {
  const groups = new Map<string, Product[]>();
  const independentProducts: Product[] = [];

  for (const product of products) {
    if (product.groupId) {
      if (!groups.has(product.groupId)) groups.set(product.groupId, []);
      groups.get(product.groupId)!.push(product);
    } else {
      independentProducts.push(product);
    }
  }

  const grouped = Array.from(groups.values()).map((items) => {
    const base = items[0]!;
    // Merge all variants and images from all products in the group
    const allVariants = items.flatMap((item) => item.variants);
    const allImages = items.flatMap((item) => item.images);

    // Deduplicate images by URL
    const uniqueImages = Array.from(
      new Map(allImages.map((img) => [img.url, img])).values()
    );

    // Deduplicate variants by ID
    const uniqueVariants = Array.from(
      new Map(allVariants.map((v) => [v.id, v])).values()
    );

    return {
      ...base,
      variants: uniqueVariants,
      images: uniqueImages,
    };
  });

  return [...independentProducts, ...grouped];
}
