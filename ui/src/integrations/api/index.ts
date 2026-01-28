export * from './keys';
import type { Category } from './keys';

export interface CartItem {
  productId: string;
  variantId: string;
  quantity: number;
  size: string;
  color: string;
  imageUrl?: string;
}

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type Size = (typeof SIZES)[number];

export const requiresSize = (categories: Category[] | undefined): boolean => {
  const names = (categories ?? []).map((c) => c.name.toLowerCase());
  return names.some((n) => ['men', 'women', 'exclusives'].includes(n));
};

export {
  useProducts,
  useProduct,
  useSuspenseProduct,
  useFeaturedProducts,
  useSuspenseFeaturedProducts,
  useSearchProducts,
  useSuspenseSearchProducts,
  useProductsByIds,
  productLoaders,
  useSyncStatus,
  useSyncProducts,
  useUpdateProductListing,
  useUpdateProductCategories,
  getPrimaryCategoryName,
  type Product,
  type ProductImage,
} from './products';

export {
  useCollections,
  useSuspenseCollections,
  useCollection,
  useSuspenseCollection,
  collectionLoaders,
  type Collection,
} from './collections';

export {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  type Category,
} from './categories';

export {
  useOrders,
  useSuspenseOrders,
  useOrder,
  useSuspenseOrder,
  useOrderByCheckoutSession,
  orderLoaders,
  type Order,
} from './orders';

export {
  useCreateCheckout,
  type CreateCheckoutInput,
  type CreateCheckoutOutput,
} from './checkout';

export {
  useProviderConfig,
  useConfigureWebhook,
  useDisableWebhook,
  useTestProvider,
  providerKeys,
  PRINTFUL_WEBHOOK_EVENTS,
  type ProviderConfig,
  type PrintfulWebhookEventType,
} from './providers';
