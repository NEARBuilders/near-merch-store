import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RelayerService } from '@/service';

const mockSend = vi.fn();
const mockFunctionCall = vi.fn(() => ({ send: mockSend }));
const mockSignedDelegateAction = vi.fn(() => ({ send: mockSend }));
const mockTransaction = vi.fn(() => ({
  functionCall: mockFunctionCall,
  signedDelegateAction: mockSignedDelegateAction,
}));

const mockStorageBalanceOf = vi.fn();

vi.mock('near-kit', () => ({
  Near: vi.fn().mockImplementation(() => ({
    transaction: mockTransaction,
  })),
  decodeSignedDelegateAction: vi.fn((payload: string) => ({
    decoded: true,
    payload,
  })),
}));

vi.mock('near-social-js', () => ({
  Graph: vi.fn().mockImplementation(() => ({
    storageBalanceOf: mockStorageBalanceOf,
  })),
}));

describe('RelayerService', () => {
  let service: RelayerService;
  const mockNear = {
    transaction: mockTransaction,
  };
  const relayerAccountId = 'relayer.near';
  const contractId = 'social.near';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new RelayerService(mockNear as any, relayerAccountId, contractId);
  });

  describe('ensureStorageDeposit', () => {
    it('should return hasStorage: true when account already has storage', async () => {
      mockStorageBalanceOf.mockResolvedValue({
        total: '1000000000000000000000000',
        available: '500000000000000000000000',
      });

      const result = await service.ensureStorageDeposit('user.near');

      expect(result).toEqual({
        accountId: 'user.near',
        hasStorage: true,
      });
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should deposit storage when account has no storage', async () => {
      mockStorageBalanceOf.mockResolvedValue(null);
      mockSend.mockResolvedValue({
        transaction: { hash: 'tx-hash-123' },
      });

      const result = await service.ensureStorageDeposit('user.near');

      expect(result).toEqual({
        accountId: 'user.near',
        hasStorage: false,
        depositTxHash: 'tx-hash-123',
      });
      expect(mockTransaction).toHaveBeenCalledWith(relayerAccountId);
      expect(mockFunctionCall).toHaveBeenCalledWith(
        contractId,
        'storage_deposit',
        { account_id: 'user.near' },
        { gas: '30 Tgas', attachedDeposit: BigInt('500000000000000000000000') }
      );
      expect(mockSend).toHaveBeenCalled();
    });

    it('should deposit storage when account has zero balance', async () => {
      mockStorageBalanceOf.mockResolvedValue({
        total: '0',
        available: '0',
      });
      mockSend.mockResolvedValue({
        transaction: { hash: 'tx-hash-456' },
      });

      const result = await service.ensureStorageDeposit('newuser.near');

      expect(result).toEqual({
        accountId: 'newuser.near',
        hasStorage: false,
        depositTxHash: 'tx-hash-456',
      });
    });
  });

  describe('submitDelegateAction', () => {
    it('should decode and submit a signed delegate action', async () => {
      const mockPayload = 'base64-encoded-payload';
      mockSend.mockResolvedValue({
        transaction: { hash: 'delegate-tx-hash' },
      });

      const result = await service.submitDelegateAction(mockPayload);

      expect(result).toEqual({
        hash: 'delegate-tx-hash',
      });
      expect(mockTransaction).toHaveBeenCalledWith(relayerAccountId);
      expect(mockSignedDelegateAction).toHaveBeenCalledWith({
        decoded: true,
        payload: mockPayload,
      });
      expect(mockSend).toHaveBeenCalled();
    });
  });
});
