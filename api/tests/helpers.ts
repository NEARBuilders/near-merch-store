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
    name: `Test Product ${productId}`,
    description: 'Test product description',
    price: 2500,
    currency: 'USD',
    category: 'apparel',
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
  await db.delete(schema.productVariants);
  await db.delete(schema.products);
}
