import { describe, it, beforeAll, afterAll, expect } from "bun:test";
import { Near, generateKey, parseAmount } from "near-kit";
import { setupTestEnvironment, teardownTestEnvironment, type TestContext } from "./setup";

// Helper to convert to yoctoNEAR for contract calls
const toYocto = (amount: string) => parseAmount(amount as any);

let ctx: TestContext;
let aliceNear: Near;
let bobNear: Near;
let aliceAccountId: string;
let bobAccountId: string;

describe("Marketplace Contract", () => {
  beforeAll(async () => {
    ctx = await setupTestEnvironment();

    // Create Alice account (seller)
    const aliceKey = generateKey();
    aliceAccountId = `alice.${ctx.rootAccountId}`;

    aliceNear = new Near({
      network: ctx.sandbox,
      privateKey: aliceKey.secretKey,
      defaultSignerId: aliceAccountId,
      defaultWaitUntil: "FINAL",
    });

    // Create Bob account (buyer)
    const bobKey = generateKey();
    bobAccountId = `bob.${ctx.rootAccountId}`;

    bobNear = new Near({
      network: ctx.sandbox,
      privateKey: bobKey.secretKey,
      defaultSignerId: bobAccountId,
      defaultWaitUntil: "FINAL",
    });

    // Create and fund Alice account
    await ctx.near
      .transaction(ctx.rootAccountId)
      .createAccount(aliceAccountId)
      .transfer(aliceAccountId, "50 NEAR")
      .addKey(aliceKey.publicKey.toString(), { type: "fullAccess" })
      .send();

    // Create and fund Bob account (separate transaction)
    await ctx.near
      .transaction(ctx.rootAccountId)
      .createAccount(bobAccountId)
      .transfer(bobAccountId, "50 NEAR")
      .addKey(bobKey.publicKey.toString(), { type: "fullAccess" })
      .send();

    // Mint an NFT for Alice
    const tokenId = "marketplace-test-1";
    const tokenMetadata = {
      title: "Marketplace Test NFT",
      description: "An NFT for marketplace testing",
      media: "https://example.com/nft.png",
    };

    const storageCost = "0.01 NEAR";

    await ctx.near
      .transaction(ctx.rootAccountId)
      .functionCall(
        ctx.nftContractId,
        "nft_mint",
        {
          token_id: tokenId,
          token_owner_id: aliceAccountId,
          token_metadata: tokenMetadata,
        },
        { gas: "30 Tgas", attachedDeposit: storageCost }
      )
      .send();

    // Approve marketplace to transfer Alice's NFT
    await aliceNear
      .transaction(aliceAccountId)
      .functionCall(
        ctx.nftContractId,
        "nft_approve",
        {
          token_id: tokenId,
          account_id: ctx.marketplaceContractId,
          msg: null,
        },
        { gas: "30 Tgas", attachedDeposit: "0.01 NEAR" }
      )
      .send();
  }, 120000);

  afterAll(async () => {
    if (ctx) {
      await teardownTestEnvironment(ctx);
    }
  }, 30000);

  describe("Storage Management", () => {
    it("should allow depositing storage", async () => {
      const depositAmount = "0.1 NEAR";

      const result = await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.marketplaceContractId,
          "storage_deposit",
          { account_id: null },
          { gas: "30 Tgas", attachedDeposit: depositAmount }
        )
        .send();

      expect(result.transaction.hash).toBeDefined();
    }, 30000);

    it("should return storage balance", async () => {
      const balance = await ctx.near.view(
        ctx.marketplaceContractId,
        "storage_balance_of",
        { account_id: aliceAccountId }
      );

      expect(balance).toBeDefined();
    });

    it("should return minimum storage balance", async () => {
      const minBalance = await ctx.near.view(
        ctx.marketplaceContractId,
        "storage_minimum_balance",
        {}
      );

      expect(minBalance).toBeDefined();
    });
  });

  describe("Listing NFTs", () => {
    it("should list an NFT for sale", async () => {
      const tokenId = "marketplace-test-1";
      const price = toYocto("10 NEAR");
      const approvalId = 1; // From the approval we made

      const result = await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.marketplaceContractId,
          "list_nft_for_sale",
          {
            nft_contract_id: ctx.nftContractId,
            token_id: tokenId,
            approval_id: approvalId,
            sale_conditions: price,
          },
          { gas: "100 Tgas", attachedDeposit: "0 NEAR" }
        )
        .send();

      expect(result.transaction.hash).toBeDefined();
    }, 30000);

    it("should retrieve the sale", async () => {
      const tokenId = "marketplace-test-1";
      const contractAndTokenId = `${ctx.nftContractId}.${tokenId}`;

      const sale = await ctx.near.view(
        ctx.marketplaceContractId,
        "get_sale",
        { nft_contract_token: contractAndTokenId }
      );

      expect(sale).toBeDefined();
      expect(sale.owner_id).toBe(aliceAccountId);
      expect(sale.token_id).toBe(tokenId);
    });

    it("should show Alice has 1 sale", async () => {
      const supply = await ctx.near.view(
        ctx.marketplaceContractId,
        "get_supply_by_owner_id",
        { account_id: aliceAccountId }
      );

      expect(supply).toBe("1");
    });
  });

  describe("Purchasing NFTs", () => {
    it("should allow Bob to purchase the NFT", async () => {
      const tokenId = "marketplace-test-1";
      const price = "10 NEAR";

      const result = await bobNear
        .transaction(bobAccountId)
        .functionCall(
          ctx.marketplaceContractId,
          "offer",
          {
            nft_contract_id: ctx.nftContractId,
            token_id: tokenId,
          },
          { gas: "150 Tgas", attachedDeposit: price }
        )
        .send();

      expect(result.transaction.hash).toBeDefined();
    }, 30000);

    it("should verify NFT ownership transferred to Bob", async () => {
      const tokenId = "marketplace-test-1";

      // Wait for the cross-contract call to complete (nft_transfer_payout callback)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const token = await ctx.near.view(
        ctx.nftContractId,
        "nft_token",
        { token_id: tokenId }
      );

      expect(token.owner_id).toBe(bobAccountId);
    }, 30000);

    it("should show sale was removed", async () => {
      const tokenId = "marketplace-test-1";
      const contractAndTokenId = `${ctx.nftContractId}.${tokenId}`;

      const sale = await ctx.near.view(
        ctx.marketplaceContractId,
        "get_sale",
        { nft_contract_token: contractAndTokenId }
      );

      expect(sale).toBeNull();
    });
  });

  describe("Price Updates", () => {
    it("should allow updating sale price", async () => {
      // First, list another NFT
      const tokenId = "marketplace-test-2";
      const tokenMetadata = {
        title: "Second Test NFT",
        description: "Another NFT for testing",
        media: "https://example.com/nft2.png",
      };

      // Mint NFT
      await ctx.near
        .transaction(ctx.rootAccountId)
        .functionCall(
          ctx.nftContractId,
          "nft_mint",
          {
            token_id: tokenId,
            token_owner_id: aliceAccountId,
            token_metadata: tokenMetadata,
          },
          { gas: "30 Tgas", attachedDeposit: "0.01 NEAR" }
        )
        .send();

      // Approve marketplace
      await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.nftContractId,
          "nft_approve",
          {
            token_id: tokenId,
            account_id: ctx.marketplaceContractId,
            msg: null,
          },
          { gas: "30 Tgas", attachedDeposit: "0.01 NEAR" }
        )
        .send();

      // List for sale
      await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.marketplaceContractId,
          "list_nft_for_sale",
          {
            nft_contract_id: ctx.nftContractId,
            token_id: tokenId,
            approval_id: 1,
            sale_conditions: toYocto("5 NEAR"),
          },
          { gas: "100 Tgas", attachedDeposit: "0 NEAR" }
        )
        .send();

      // Update price
      const newPrice = toYocto("7.5 NEAR");
      const result = await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.marketplaceContractId,
          "update_price",
          {
            nft_contract_id: ctx.nftContractId,
            token_id: tokenId,
            price: newPrice,
          },
          { gas: "30 Tgas", attachedDeposit: "1 yocto" }
        )
        .send();

      expect(result.transaction.hash).toBeDefined();

      // Verify price was updated
      const contractAndTokenId = `${ctx.nftContractId}.${tokenId}`;
      const sale = await ctx.near.view(
        ctx.marketplaceContractId,
        "get_sale",
        { nft_contract_token: contractAndTokenId }
      );

      expect(sale.sale_conditions).toBe(newPrice);
    }, 60000);
  });
});
