import { getTestDb } from './setup';
import * as schema from '@/db/schema';

export async function createTestOrder(orderId: string, overrides: Partial<typeof schema.orders.$inferInsert> = {}) {
  const db = getTestDb();
  
  const orderData: typeof schema.orders.$inferInsert = {
    id: orderId,
    userId: 'test-user.near',
    status: 'pending',
    totalAmount: 10000,
    currency: 'USD',
    checkoutSessionId: 'test_session_123',
    checkoutProvider: 'pingpay',
    shippingAddress: {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      addressLine1: '123 Test St',
      city: 'Test City',
      state: 'TS',
      postCode: '12345',
      country: 'US',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.orders).values(orderData);
  
  return orderData;
}

export async function clearOrders() {
  const db = getTestDb();
  await db.delete(schema.orders);
}

export async function createTestProduct(productId: string, overrides: Partial<typeof schema.products.$inferInsert> = {}) {
  const db = getTestDb();
  
  const productData: typeof schema.products.$inferInsert = {
    id: productId,
    publicKey: productId.slice(-12),
    slug: `test-product-${productId}`,
    name: `Test Product ${productId}`,
    description: 'Test product description',
    price: 2500,
    currency: 'USD',
    brand: 'Test Brand',
    fulfillmentProvider: 'printful',
    source: 'test',
    listed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.products).values(productData);
  
  return productData;
}

export async function createTestProductVariant(variantId: string, productId: string, overrides: Partial<typeof schema.productVariants.$inferInsert> = {}) {
  const db = getTestDb();
  
  const variantData: typeof schema.productVariants.$inferInsert = {
    id: variantId,
    productId,
    name: `Test Variant ${variantId}`,
    sku: `SKU-${variantId}`,
    price: 2500,
    currency: 'USD',
    inStock: true,
    createdAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.productVariants).values(variantData);
  
  return variantData;
}

export async function clearProducts() {
  const db = getTestDb();
  await db.delete(schema.productImages);
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
}

export async function createTestProductImage(imageId: string, productId: string, overrides: Partial<typeof schema.productImages.$inferInsert> = {}) {
  const db = getTestDb();
  
  const imageData: typeof schema.productImages.$inferInsert = {
    id: imageId,
    productId,
    url: 'https://example.com/image.jpg',
    type: 'primary',
    order: 0,
    createdAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.productImages).values(imageData);
  return imageData;
}

export async function createTestProductWithImages(productId: string, overrides: Partial<typeof schema.products.$inferInsert> = {}) {
  const db = getTestDb();
  
  const productData: typeof schema.products.$inferInsert = {
    id: productId,
    publicKey: productId.slice(-12),
    slug: `test-product-${productId}`,
    name: `Test Product ${productId}`,
    description: 'Test product description',
    price: 2500,
    currency: 'USD',
    brand: 'Test Brand',
    fulfillmentProvider: 'printful',
    source: 'test',
    listed: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.products).values(productData);
  
  const image1 = await createTestProductImage(`img_1_${productId}`, productId, {
    url: 'https://example.com/image1.jpg',
    type: 'primary',
    order: 0,
  });
  
  const image2 = await createTestProductImage(`img_2_${productId}`, productId, {
    url: 'https://example.com/image2.jpg',
    type: 'preview',
    order: 1,
  });
  
  return { product: productData, images: [image1, image2] };
}

export async function createTestCollection(slug: string, overrides: Partial<typeof schema.collections.$inferInsert> = {}) {
  const db = getTestDb();
  
  const collectionData: typeof schema.collections.$inferInsert = {
    slug,
    name: `Collection ${slug}`,
    showInCarousel: false,
    carouselOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.collections).values(collectionData);
  return collectionData;
}

export async function clearCollections() {
  const db = getTestDb();
  await db.delete(schema.productCollections);
  await db.delete(schema.collections);
}

export async function addProductToCollection(productId: string, collectionSlug: string) {
  const db = getTestDb();
  await db.insert(schema.productCollections).values({
    productId,
    collectionSlug,
  });
}

export async function createTestOrderItem(orderItemId: string, orderId: string, overrides: Partial<typeof schema.orderItems.$inferInsert> = {}) {
  const db = getTestDb();
  
  const orderItemData: typeof schema.orderItems.$inferInsert = {
    id: orderItemId,
    orderId,
    productId: 'test_product_id',
    variantId: 'test_variant_id',
    productName: 'Test Product',
    variantName: 'Test Variant',
    quantity: 1,
    unitPrice: 2500,
    createdAt: new Date(),
    ...overrides,
  };
  
  await db.insert(schema.orderItems).values(orderItemData);
  return orderItemData;
}

export async function clearOrdersItems() {
  const db = getTestDb();
  await db.delete(schema.orderItems);
}

export function generateFulfillmentReferenceId(userId: string): string {
  return `order_${Date.now()}_${userId}`;
}
