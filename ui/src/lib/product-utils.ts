export const COLOR_MAP: Record<string, string> = {
  Black: "#000000",
  White: "#FFFFFF",
  Navy: "#000080",
  "Dark Grey Heather": "#333333",
  "Sport Grey": "#808080",
  Blue: "#0000FF",
  Red: "#FF0000",
  Green: "#008000",
  Light: "#F0F0F0",
  Dark: "#1A1A1A",
  Heather: "#999999",
  Royal: "#4169E1",
  Orange: "#FFA500",
  Purple: "#800080",
  Pink: "#FFC0CB",
  "Soft Pink": "#FFB6C1",
  Yellow: "#FFFF00",
  Gold: "#FFD700",
  Charcoal: "#36454F",
  Grey: "#808080",
  Gray: "#808080",
  "Athletic Heather": "#B0B0B0",
  "Black Heather": "#2B2B2B",
  "Heather Emerald": "#00A86B",
  "Heather Navy": "#1B2E4A",
  "Military Green": "#4B5320",
  "Heather Slate": "#708090",
  Cranberry: "#9B1B30",
  "Green Camo": "#4B6F44",
};

export function getOptionValue(
  attributes: Array<{ name: string; value: string }> | undefined | null,
  optionName: string
): string | undefined {
  return attributes?.find(
    (opt) => opt.name.toLowerCase() === optionName.toLowerCase()
  )?.value;
}

export function getAttributeHex(
  attributes: Array<{ name: string; value: string }> | undefined,
  optionName: string
): string | undefined {
  if (!attributes) return undefined;
  const attr = attributes.find(
    (opt) => opt.name.toLowerCase() === optionName.toLowerCase()
  );
  return (attr as unknown as { hex?: string })?.hex;
}

/**
 * Finds the image URL for a specific variant.
 * Prioritizes variant-specific images (with variantIds), excluding mockup and detail types.
 * Falls back to first variant image, then product image, then variant fulfillment design file.
 */
export function getVariantImageUrl(
  product: { images?: Array<{ url: string; type?: string; variantIds?: string[] }>; variants?: Array<{ id: string; fulfillmentConfig?: { designFiles?: Array<{ url: string }> } }> },
  variantId: string
): string | undefined {
  if (!product.images || product.images.length === 0) {
    // Fallback to variant fulfillment design file
    const variant = product.variants?.find((v) => v.id === variantId);
    return variant?.fulfillmentConfig?.designFiles?.[0]?.url;
  }

  // First, try to find a variant-specific image (not mockup, not detail)
  const variantImage = product.images.find(
    (img) =>
      img.variantIds?.includes(variantId) &&
      img.type !== "mockup" &&
      img.type !== "detail"
  );

  if (variantImage) {
    return variantImage.url;
  }

  // Fallback to first non-mockup, non-detail image with variantIds
  const fallbackImage = product.images.find(
    (img) =>
      img.variantIds &&
      img.variantIds.length > 0 &&
      img.type !== "mockup" &&
      img.type !== "detail"
  );

  if (fallbackImage) {
    return fallbackImage.url;
  }

  // Fallback to any non-mockup, non-detail image
  const anyImage = product.images.find(
    (img) => img.type !== "mockup" && img.type !== "detail"
  );

  if (anyImage) {
    return anyImage.url;
  }

  // Last resort: variant fulfillment design file
  const variant = product.variants?.find((v) => v.id === variantId);
  return variant?.fulfillmentConfig?.designFiles?.[0]?.url;
}
