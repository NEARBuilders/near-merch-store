import { describe, it, beforeAll, afterAll, expect } from "bun:test";
// @ts-ignore - bun:test types
import { Near, generateKey } from "near-kit";
import { setupTestEnvironment, teardownTestEnvironment, type TestContext } from "./setup";

let ctx: TestContext;
let aliceNear: Near;
let aliceAccountId: string;

describe("NFT Contract", () => {
  beforeAll(async () => {
    ctx = await setupTestEnvironment();
    
    // Create Alice account for testing
    const aliceKey = generateKey();
    aliceAccountId = `alice.${ctx.rootAccountId}`;
    
    console.log(`Creating test account: ${aliceAccountId}`);
    
    aliceNear = new Near({
      network: {
        networkId: "sandbox",
        rpcUrl: ctx.sandbox.rpcUrl,
      },
      privateKey: aliceKey.secretKey,
      defaultSignerId: aliceAccountId,
      defaultWaitUntil: "FINAL",
    });

    // Create and fund Alice account
    await ctx.near
      .transaction(ctx.rootAccountId)
      .createAccount(aliceAccountId)
      .transfer(aliceAccountId, "50 NEAR")
      .addKey(aliceKey.publicKey.toString(), { type: "fullAccess" })
      .send();
  });

  afterAll(async () => {
    if (ctx) {
      await teardownTestEnvironment(ctx);
    }
  });

  describe("Contract Initialization", () => {
    it("should have correct metadata", async () => {
      const metadata = await ctx.near.view(
        ctx.nftContractId,
        "nft_metadata",
        {}
      );

      expect(metadata).toHaveProperty("spec");
      expect(metadata).toHaveProperty("name");
      expect(metadata).toHaveProperty("symbol");
    });

    it("should return total supply of 0 initially", async () => {
      const supply = await ctx.near.view(
        ctx.nftContractId,
        "nft_total_supply",
        {}
      );

      expect(supply).toBe("0");
    });
  });

  describe("NFT Minting", () => {
    it("should mint an NFT to Alice", async () => {
      const tokenId = "token-1";
      const tokenMetadata = {
        title: "Test NFT",
        description: "A test NFT",
        media: "https://example.com/image.png",
      };

      // Calculate storage cost (approximate)
      const storageCost = "0.01 NEAR";

      const result = await ctx.near
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

      expect(result.transaction.hash).toBeDefined();
    });

    it("should retrieve the minted NFT", async () => {
      const tokenId = "token-1";

      const token = await ctx.near.view(
        ctx.nftContractId,
        "nft_token",
        { token_id: tokenId }
      );

      expect(token).toBeDefined();
      expect(token.owner_id).toBe(aliceAccountId);
      expect(token.token_id).toBe(tokenId);
      expect(token.metadata).toHaveProperty("title", "Test NFT");
    });

    it("should show Alice owns 1 NFT", async () => {
      const supply = await ctx.near.view(
        ctx.nftContractId,
        "nft_supply_for_owner",
        { account_id: aliceAccountId }
      );

      expect(supply).toBe("1");
    });

    it("should list Alice's NFTs", async () => {
      const tokens = await ctx.near.view(
        ctx.nftContractId,
        "nft_tokens_for_owner",
        {
          account_id: aliceAccountId,
          from_index: "0",
          limit: 10,
        }
      );

      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBe(1);
      expect(tokens[0].token_id).toBe("token-1");
    });
  });

  describe("NFT Transfer", () => {
    it("should transfer NFT from Alice to root account", async () => {
      const tokenId = "token-1";

      const result = await aliceNear
        .transaction(aliceAccountId)
        .functionCall(
          ctx.nftContractId,
          "nft_transfer",
          {
            receiver_id: ctx.rootAccountId,
            token_id: tokenId,
            memo: "Test transfer",
          },
          { gas: "30 Tgas", attachedDeposit: "1 yocto" }
        )
        .send();

      expect(result.transaction.hash).toBeDefined();

      // Verify ownership changed
      const token = await ctx.near.view(
        ctx.nftContractId,
        "nft_token",
        { token_id: tokenId }
      );

      expect(token.owner_id).toBe(ctx.rootAccountId);
    });
  });
});

