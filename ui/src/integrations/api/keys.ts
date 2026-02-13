export type CategoryId = string;

export interface Category {
  slug: string;
  id: string;
  name: string;
  description?: string;
  image?: string;
}

export interface ProductType {
  slug: string;
  label: string;
  description?: string;
  displayOrder: number;
}

export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: { 
    productTypeSlug?: string;
    collectionSlugs?: string[]; 
    tags?: string[];
    featured?: boolean;
    limit?: number; 
    offset?: number; 
    includeUnlisted?: boolean;
  }) => [...productKeys.lists(), filters] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  featured: (limit?: number) => [...productKeys.all, 'featured', { limit }] as const,
  search: (query: string, limit?: number) =>
    [...productKeys.all, 'search', { query, limit }] as const,
  syncStatus: () => [...productKeys.all, 'syncStatus'] as const,
};

export const productTypeKeys = {
  all: ['productTypes'] as const,
  lists: () => [...productTypeKeys.all, 'list'] as const,
  list: () => [...productTypeKeys.lists()] as const,
  details: () => [...productTypeKeys.all, 'detail'] as const,
  detail: (slug: string) => [...productTypeKeys.details(), slug] as const,
};

export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: () => [...categoryKeys.lists()] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (slug: string) => [...categoryKeys.details(), slug] as const,
};

export const collectionKeys = {
  all: ['collections'] as const,
  lists: () => [...collectionKeys.all, 'list'] as const,
  list: () => [...collectionKeys.lists()] as const,
  carousel: () => [...collectionKeys.all, 'carousel'] as const,
  details: () => [...collectionKeys.all, 'detail'] as const,
  detail: (slug: string) => [...collectionKeys.details(), slug] as const,
};

export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: { limit?: number; offset?: number }) =>
    [...orderKeys.lists(), filters] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
};
