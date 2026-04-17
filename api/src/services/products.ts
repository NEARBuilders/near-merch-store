import { Context, Effect, Layer } from 'every-plugin/effect';
import type { MarketplaceRuntime } from '../runtime';
import type { Collection, Product, ProductCriteria } from '../schema';
import { ProductStore, CollectionStore, type ProductWithImages } from '../store';

export class ProductService extends Context.Tag('ProductService')<
  ProductService,
  {
    readonly getProducts: (options: ProductCriteria) => Effect.Effect<{ products: Product[]; total: number }, Error>;
    readonly getProduct: (id: string) => Effect.Effect<{ product: Product }, Error>;
    readonly searchProducts: (options: {
      query: string;
      limit?: number;
    }) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getFeaturedProducts: (limit?: number) => Effect.Effect<{ products: Product[] }, Error>;
    readonly getCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly getCollection: (
      slug: string
    ) => Effect.Effect<{ collection: Collection; products: Product[] }, Error>;
    readonly getCarouselCollections: () => Effect.Effect<{ collections: Collection[] }, Error>;
    readonly updateCollection: (
      slug: string,
      data: {
        name?: string;
        description?: string;
        image?: string;
        badge?: string;
        carouselTitle?: string;
        carouselDescription?: string;
        showInCarousel?: boolean;
        carouselOrder?: number;
      }
    ) => Effect.Effect<{ collection: Collection | null }, Error>;
    readonly updateCollectionFeaturedProduct: (
      slug: string,
      productId: string | null
    ) => Effect.Effect<{ collection: Collection | null }, Error>;
    readonly updateProductListing: (
      id: string,
      listed: boolean
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductTags: (
      id: string,
      tags: string[]
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductFeatured: (
      id: string,
      featured: boolean
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly updateProductCollections: (
      id: string,
      collectionSlugs: string[]
    ) => Effect.Effect<{ success: boolean; product?: Product }, Error>;
    readonly getCategories: () => Effect.Effect<{ categories: Collection[] }, Error>;
    readonly createCategory: (data: {
      name: string;
      slug: string;
      description?: string;
      image?: string;
    }) => Effect.Effect<{ category: Collection }, Error>;
    readonly deleteCategory: (slug: string) => Effect.Effect<{ success: boolean }, Error>;
    readonly createProduct: (product: ProductWithImages) => Effect.Effect<Product, Error>;
    readonly deleteProduct: (id: string) => Effect.Effect<void, Error>;
  }
>() {}

export const ProductServiceLive = (runtime: MarketplaceRuntime) =>
  Layer.effect(
    ProductService,
    Effect.gen(function* () {
      const store = yield* ProductStore;
      const collectionStore = yield* CollectionStore;

      return {
        getProducts: (options) =>
          Effect.gen(function* () {
            const { productTypeSlug, collectionSlugs, tags, featured, limit = 50, offset = 0, includeUnlisted = false } = options;
            return yield* store.findMany({ productTypeSlug, collectionSlugs, tags, featured, limit, offset, includeUnlisted });
          }),

        getProduct: (identifier) =>
          Effect.gen(function* () {
            const product = yield* store.find(identifier);
            if (!product) {
              return yield* Effect.fail(new Error(`Product not found: ${identifier}`));
            }
            return { product };
          }),

        searchProducts: (options) =>
          Effect.gen(function* () {
            const { query, limit = 20 } = options;
            const products = yield* store.search(query, limit);
            return { products };
          }),

        getFeaturedProducts: (limit = 12) =>
          Effect.gen(function* () {
            const result = yield* store.findMany({ featured: true, limit, offset: 0, includeUnlisted: false });
            if (result.products.length === 0) {
              const fallback = yield* store.findMany({ limit, offset: 0, includeUnlisted: false });
              return { products: fallback.products };
            }
            return { products: result.products };
          }),

        getCollections: () =>
          Effect.gen(function* () {
            const collections = yield* collectionStore.findAll();
            return { collections };
          }),

        getCollection: (slug) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.find(slug);
            if (!collection) {
              return yield* Effect.fail(new Error(`Collection not found: ${slug}`));
            }
            const result = yield* store.findMany({
              collectionSlugs: [slug],
              limit: 100,
              offset: 0,
              includeUnlisted: false,
            });
            return { collection, products: result.products };
          }),

        getCarouselCollections: () =>
          Effect.gen(function* () {
            const collections = yield* collectionStore.findCarouselCollections();
            return { collections };
          }),

        updateCollection: (slug, data) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.update(slug, data);
            return { collection };
          }),

        updateCollectionFeaturedProduct: (slug, productId) =>
          Effect.gen(function* () {
            const collection = yield* collectionStore.updateFeaturedProduct(slug, productId);
            return { collection };
          }),

        updateProductListing: (id, listed) =>
          Effect.gen(function* () {
            const product = yield* store.updateListing(id, listed);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductTags: (id, tags) =>
          Effect.gen(function* () {
            const product = yield* store.updateTags(id, tags);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductFeatured: (id, featured) =>
          Effect.gen(function* () {
            const product = yield* store.updateFeatured(id, featured);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        updateProductCollections: (id, collectionSlugs) =>
          Effect.gen(function* () {
            yield* collectionStore.setProductCollections(id, collectionSlugs);
            const product = yield* store.find(id);
            if (!product) {
              return { success: false };
            }
            return { success: true, product };
          }),

        getCategories: () =>
          Effect.gen(function* () {
            const categories = yield* collectionStore.findAll();
            return { categories };
          }),

        createCategory: (data) =>
          Effect.gen(function* () {
            const category = yield* collectionStore.create(data);
            return { category };
          }),

        deleteCategory: (slug) =>
          Effect.gen(function* () {
            yield* collectionStore.delete(slug);
            return { success: true };
          }),

        createProduct: (product) =>
          Effect.gen(function* () {
            return yield* store.upsert(product);
          }),

        deleteProduct: (id) =>
          Effect.gen(function* () {
            yield* store.delete(id);
          }),
      };
    }),
  );
