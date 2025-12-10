import { Near, decodeSignedDelegateAction } from 'near-kit';
import { Graph } from 'near-social-js';
import type { ConnectOutput, PublishOutput } from './schema';

const DEFAULT_STORAGE_DEPOSIT = '500000000000000000000000';
const DEFAULT_CONTRACT_ID = 'social.near';

export class RelayerService {
  private readonly near: Near;
  private readonly graph: Graph;
  private readonly relayerAccountId: string;
  private readonly contractId: string;

  constructor(
    near: Near,
    relayerAccountId: string,
    contractId: string = DEFAULT_CONTRACT_ID
  ) {
    this.near = near;
    this.relayerAccountId = relayerAccountId;
    this.contractId = contractId;
    this.graph = new Graph({
      near,
      contractId,
    });
  }

  async ensureStorageDeposit(accountId: string): Promise<ConnectOutput> {
    // social.near contract requires deposit for storing data
    const storageBalance = await this.graph.storageBalanceOf(accountId);
    const hasStorage =
      storageBalance !== null && BigInt(storageBalance.total) > 0n;

    if (hasStorage) {
      return {
        accountId,
        hasStorage: true,
      };
    }

    // otherwise
    const result = await this.near
      .transaction(this.relayerAccountId)
      .functionCall(
        this.contractId,
        'storage_deposit',
        { account_id: accountId },
        { gas: '30 Tgas', attachedDeposit: BigInt(DEFAULT_STORAGE_DEPOSIT) }
      )
      .send();

    return {
      accountId,
      hasStorage: false,
      depositTxHash: result.transaction.hash,
    };
  }

  async submitDelegateAction(payload: string): Promise<PublishOutput> {
    const signedDelegateAction = decodeSignedDelegateAction(payload);

    console.debug(`[Relayer] signed delegate submitted to ${this.relayerAccountId}`);

    const result = await this.near
      .transaction(this.relayerAccountId)
      .signedDelegateAction(signedDelegateAction)
      .send();

    return { hash: result.transaction.hash };
  }
}
