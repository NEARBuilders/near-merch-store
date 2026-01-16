import { describe, it, expect } from 'vitest';
import { groupProviderProducts } from '../../src/services/products';
import { ProviderProduct } from '../../src/services/fulfillment/schema';

describe('groupProviderProducts', () => {
  it('groups products by explicit externalId', () => {
    const products: ProviderProduct[] = [
      {
        id: 1,
        sourceId: 1,
        externalId: 'my-unified-id',
        name: 'Hat Black',
        variants: [{ id: 101, externalId: 'v101', name: 'Black', retailPrice: 10, currency: 'USD' }],
      },
      {
        id: 2,
        sourceId: 2,
        externalId: 'my-unified-id',
        name: 'Hat White',
        variants: [{ id: 102, externalId: 'v102', name: 'White', retailPrice: 10, currency: 'USD' }],
      },
    ];

    const grouped = groupProviderProducts(products);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.id).toBe('group-explicit-my-unified-id');
  });

  it('groups products by group:tag', () => {
    const products: ProviderProduct[] = [
      {
        id: 1,
        sourceId: 1,
        externalId: '1',
        name: 'Hat Black',
        tags: ['group:hat-123'],
        variants: [{ id: 101, externalId: 'v101', name: 'Black', retailPrice: 10, currency: 'USD' }],
      },
      {
        id: 2,
        sourceId: 2,
        externalId: '2',
        name: 'Hat White',
        tags: ['group:hat-123'],
        variants: [{ id: 102, externalId: 'v102', name: 'White', retailPrice: 10, currency: 'USD' }],
      },
    ];

    const grouped = groupProviderProducts(products);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.id).toBe('group-tag-hat-123');
    expect(grouped[0]?.variants).toHaveLength(2);
  });

  it('groups by design-aware heuristic', () => {
    const products: ProviderProduct[] = [
      {
        id: 1,
        sourceId: 1,
        externalId: '1',
        name: 'Near Extreme Black Hat',
        variants: [{ 
          id: 101, 
          externalId: 'v101', 
          name: 'Black', 
          retailPrice: 10, 
          currency: 'USD', 
          catalogProductId: 206,
          designFiles: [{ placement: 'front', url: 'design-1.png' }]
        }],
      },
      {
        id: 2,
        sourceId: 2,
        externalId: '2',
        name: 'Near Extreme White Hat',
        variants: [{ 
          id: 102, 
          externalId: 'v102', 
          name: 'White', 
          retailPrice: 10, 
          currency: 'USD', 
          catalogProductId: 206,
          designFiles: [{ placement: 'front', url: 'design-1.png' }]
        }],
      },
    ];

    const grouped = groupProviderProducts(products);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.name).toBe('Near Extreme Hat');
    expect(grouped[0]?.variants).toHaveLength(2);
  });

  it('groups products by catalog ID + normalized name (heuristic)', () => {
    const products: ProviderProduct[] = [
      {
        id: 1,
        sourceId: 1,
        externalId: '1',
        name: 'NEAR AI Black Shirt',
        variants: [{ 
          id: 101, 
          externalId: 'v101', 
          name: 'Black', 
          retailPrice: 20, 
          currency: 'USD', 
          catalogProductId: 111,
        }],
      },
      {
        id: 2,
        sourceId: 2,
        externalId: '2',
        name: 'NEAR AI White Shirt',
        variants: [{ 
          id: 102, 
          externalId: 'v102', 
          name: 'White', 
          retailPrice: 30, // Different price is OK
          currency: 'USD', 
          catalogProductId: 111, // Same catalog ID
        }],
      },
    ];

    const grouped = groupProviderProducts(products);
    expect(grouped).toHaveLength(1); // Should be grouped!
    expect(grouped[0]?.name).toBe('NEAR AI Shirt');
    expect(grouped[0]?.variants).toHaveLength(2);
  });

  it('preserves originalSourceId for each variant when merging', () => {
    const products: ProviderProduct[] = [
      {
        id: 1,
        sourceId: 100, // Original Printful product ID for Black Hat
        externalId: 'hat-sku',
        name: 'Hat Black',
        variants: [{ id: 101, externalId: 'v101', name: 'Black', retailPrice: 10, currency: 'USD' }],
      },
      {
        id: 2,
        sourceId: 200, // Original Printful product ID for White Hat
        externalId: 'hat-sku',
        name: 'Hat White',
        variants: [{ id: 102, externalId: 'v102', name: 'White', retailPrice: 10, currency: 'USD' }],
      },
    ];

    const grouped = groupProviderProducts(products);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]?.variants).toHaveLength(2);
    
    // Each variant should preserve its original parent product's sourceId
    expect(grouped[0]?.variants[0]?.originalSourceId).toBe(100);
    expect(grouped[0]?.variants[1]?.originalSourceId).toBe(200);
  });
});
