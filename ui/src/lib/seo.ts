import type { Collection, Product } from '@/integrations/api';

export const SITE_NAME = 'NEAR Merch Store';
const SITE_HANDLE = '@nearmerch';
export const DEFAULT_DESCRIPTION = 'Shop exclusive NEAR Protocol merchandise - Official blockchain apparel, accessories, and collectibles for the NEAR ecosystem';

type SeoHeadInput = {
  title: string;
  description: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  type?: 'website' | 'product';
  jsonLd?: Record<string, unknown> | null;
  robots?: string;
};

function normalizeText(value?: string | null, fallback = '') {
  if (!value) return fallback;
  return value.replace(/\s+/g, ' ').trim() || fallback;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

export function absoluteUrl(baseUrl: string, path: string) {
  if (!baseUrl) return path;
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
}

export function getSiteMetadataImage(assetsUrl: string) {
  return absoluteUrl(assetsUrl, '/metadata.png');
}

export function createSeoHead({
  title,
  description,
  url,
  image,
  imageAlt,
  type = 'website',
  jsonLd,
  robots,
}: SeoHeadInput) {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      ...(robots ? [{ name: 'robots', content: robots }] : []),
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      ...(url ? [{ property: 'og:url', content: url }] : []),
      { property: 'og:site_name', content: SITE_NAME },
      { property: 'og:locale', content: 'en_US' },
      ...(image
        ? [
            { property: 'og:image', content: image },
            { property: 'og:image:width', content: '1200' },
            { property: 'og:image:height', content: '630' },
            ...(imageAlt ? [{ property: 'og:image:alt', content: imageAlt }] : []),
          ]
        : []),
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:site', content: SITE_HANDLE },
      ...(image ? [{ name: 'twitter:image', content: image }] : []),
      ...(imageAlt ? [{ name: 'twitter:image:alt', content: imageAlt }] : []),
    ],
    links: url ? [{ rel: 'canonical', href: url }] : [],
    scripts: jsonLd
      ? [
          {
            type: 'application/ld+json',
            children: JSON.stringify(jsonLd),
          },
        ]
      : [],
  };
}

export function buildProductDescription(product: Product) {
  const description = normalizeText(product.description);
  if (description) return truncateText(description, 180);

  const collectionName = product.collections?.[0]?.name;
  const parts = [collectionName, product.brand].filter(Boolean);
  const fallback = parts.length > 0
    ? `${parts.join(' - ')} official NEAR merchandise starting at $${product.price}.`
    : `Official NEAR merchandise starting at $${product.price}.`;

  return truncateText(fallback, 180);
}

export function buildCollectionDescription(collection: Collection | undefined, productCount: number) {
  const description = normalizeText(collection?.description);
  if (description) return truncateText(description, 180);

  if (collection?.name) {
    return truncateText(
      `Browse ${productCount} ${productCount === 1 ? 'item' : 'items'} in the ${collection.name} collection on the NEAR Merch Store.`,
      180,
    );
  }

  return truncateText(
    `Browse curated NEAR merch collections with ${productCount} ${productCount === 1 ? 'item' : 'items'} available now.`,
    180,
  );
}

export function buildProductJsonLd(product: Product, url: string, image?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: buildProductDescription(product),
    image: image ? [image] : undefined,
    brand: product.brand
      ? {
          '@type': 'Brand',
          name: product.brand,
        }
      : undefined,
    category: product.collections?.[0]?.name,
    sku: product.id,
    url,
    offers: {
      '@type': 'Offer',
      priceCurrency: product.currency || 'USD',
      price: String(product.price),
      availability: product.variants?.some((variant) => variant.availableForSale)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

export function buildSiteJsonLd({
  url,
  description = DEFAULT_DESCRIPTION,
}: {
  url?: string;
  description?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: SITE_NAME,
    url,
    description,
    brand: {
      '@type': 'Brand',
      name: 'NEAR Protocol',
    },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
    },
  };
}

export function getProductSeoImage(product: Pick<Product, 'thumbnailImage' | 'images'>) {
  return product.thumbnailImage || product.images?.[0]?.url;
}

export function getCollectionSeoImage(
  collection: Pick<Collection, 'image' | 'featuredProduct'> | undefined,
  products: Array<Pick<Product, 'thumbnailImage' | 'images'>>,
) {
  return collection?.image
    || collection?.featuredProduct?.thumbnailImage
    || products.find((product) => getProductSeoImage(product))?.thumbnailImage
    || products.flatMap((product) => product.images ?? []).find((image) => !!image?.url)?.url;
}

export function buildCollectionJsonLd(args: {
  name: string;
  description: string;
  url: string;
  image?: string;
  products?: Product[];
  totalItems?: number;
}) {
  const itemListElement = (args.products ?? []).slice(0, 8).map((product, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    url: absoluteUrl(args.url, `/products/${product.slug || product.id}`),
    name: product.title,
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: args.name,
    description: args.description,
    url: args.url,
    image: args.image,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: args.totalItems ?? args.products?.length ?? itemListElement.length,
      itemListElement,
    },
  };
}
