import { describe, expect, it } from 'vitest';
import { buildReferralFeeDetails } from '@/services/checkout';

describe('referral fee allocation', () => {
  it('allocates totalAmount proportionally to referred items', () => {
    const referralFeeDetails = buildReferralFeeDetails({
      providerItems: [
        {
          item: { productId: 'book', variantId: 'book-var', quantity: 1 },
          productId: 'book',
          variantId: 'book-var',
          price: 20,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Book',
          metadata: {
            fees: [],
            affiliate: {
              referral: {
                enabled: true,
                feeBps: 5000,
              },
            },
          },
          referralAccountId: 'reader.near',
        },
        {
          item: { productId: 'other', variantId: 'other-var', quantity: 1 },
          productId: 'other',
          variantId: 'other-var',
          price: 80,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Other',
          metadata: { fees: [] },
          referralAccountId: undefined,
        },
      ],
      userId: 'buyer.near',
      totalSubtotal: 100,
      totalAmount: 120,
    });

    expect(referralFeeDetails).toHaveLength(1);

    const [detail] = referralFeeDetails;

    expect(detail).toMatchObject({
      productId: 'book',
      recipient: 'reader.near',
      configuredFeeBps: 5000,
      itemSubtotal: 20,
    });
    expect(detail?.allocationWeight).toBeCloseTo(0.2);
    expect(detail?.allocatedTotalAmount).toBeCloseTo(24);
    expect(detail?.feeAmount).toBeCloseTo(12);
  });

  it('splits totalAmount proportionally across multiple recipients', () => {
    const referralFeeDetails = buildReferralFeeDetails({
      providerItems: [
        {
          item: { productId: 'book', variantId: 'book-var', quantity: 1 },
          productId: 'book',
          variantId: 'book-var',
          price: 20,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Book',
          metadata: {
            fees: [],
            affiliate: {
              referral: {
                enabled: true,
                feeBps: 5000,
              },
            },
          },
          referralAccountId: 'reader.near',
        },
        {
          item: { productId: 'poster', variantId: 'poster-var', quantity: 1 },
          productId: 'poster',
          variantId: 'poster-var',
          price: 30,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Poster',
          metadata: {
            fees: [],
            affiliate: {
              referral: {
                enabled: true,
                feeBps: 1000,
              },
            },
          },
          referralAccountId: 'artist.near',
        },
        {
          item: { productId: 'other', variantId: 'other-var', quantity: 1 },
          productId: 'other',
          variantId: 'other-var',
          price: 50,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Other',
          metadata: { fees: [] },
          referralAccountId: undefined,
        },
      ],
      userId: 'buyer.near',
      totalSubtotal: 100,
      totalAmount: 120,
    });

    const readerDetail = referralFeeDetails.find((detail) => detail.recipient === 'reader.near');
    const artistDetail = referralFeeDetails.find((detail) => detail.recipient === 'artist.near');

    expect(readerDetail).toBeDefined();
    expect(readerDetail?.allocationWeight).toBeCloseTo(0.2);
    expect(readerDetail?.allocatedTotalAmount).toBeCloseTo(24);
    expect(readerDetail?.feeAmount).toBeCloseTo(12);

    expect(artistDetail).toBeDefined();
    expect(artistDetail?.allocationWeight).toBeCloseTo(0.3);
    expect(artistDetail?.allocatedTotalAmount).toBeCloseTo(36);
    expect(artistDetail?.feeAmount).toBeCloseTo(3.6);
  });

  it('ignores self-referrals', () => {
    const referralFeeDetails = buildReferralFeeDetails({
      providerItems: [
        {
          item: { productId: 'book', variantId: 'book-var', quantity: 1 },
          productId: 'book',
          variantId: 'book-var',
          price: 20,
          currency: 'USD',
          fulfillmentConfig: undefined,
          productTitle: 'Book',
          metadata: {
            fees: [],
            affiliate: {
              referral: {
                enabled: true,
                feeBps: 5000,
              },
            },
          },
          referralAccountId: 'buyer.near',
        },
      ],
      userId: 'buyer.near',
      totalSubtotal: 20,
      totalAmount: 24,
    });

    expect(referralFeeDetails).toEqual([]);
  });
});
