// @ts-ignore - near-sandbox is CommonJS
const { Sandbox, DEFAULT_ACCOUNT_ID, DEFAULT_PRIVATE_KEY } = require("near-sandbox");
import { Near, generateKey, parseKey, type PrivateKey } from "near-kit";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestContext {
  sandbox: InstanceType<typeof Sandbox>;
  near: Near;
  rootAccountId: string;
  rootPrivateKey: string;
  nftContractId: string;
  marketplaceContractId: string;
}

/**
 * Start a sandbox and deploy both NFT and marketplace contracts
 */
export async function setupTestEnvironment(): Promise<TestContext> {
  // Start sandbox
  const sandbox = await Sandbox.start({});
  console.log(`✅ Sandbox started at: ${sandbox.rpcUrl}`);

  // Sandbox provides a default account - use it
  const rootAccountId = DEFAULT_ACCOUNT_ID;
  const rootPrivateKey = DEFAULT_PRIVATE_KEY;

  // Create Near instance pointing to sandbox
  const near = new Near({
    network: {
      networkId: "sandbox",
      rpcUrl: sandbox.rpcUrl,
    },
    privateKey: rootPrivateKey as PrivateKey,
    defaultSignerId: rootAccountId,
    defaultWaitUntil: "FINAL",
  });

  console.log(`✅ Using sandbox default account: ${rootAccountId}`);

  // Deploy NFT contract
  const nftKey = generateKey();
  const nftAccountId = `nft.${rootAccountId}`;
  
  console.log(`📦 Deploying NFT contract to ${nftAccountId}...`);
  
  // Read the compiled WASM
  const nftWasmPath = join(
    __dirname,
    "../nft/target/wasm32-unknown-unknown/release/nft_contract.wasm"
  );
  const nftWasm = readFileSync(nftWasmPath);

  // Create account and deploy
  // Note: Subaccounts can be created from the root account
  await near
    .transaction(rootAccountId)
    .createAccount(nftAccountId)
    .transfer(nftAccountId, "100 NEAR")
    .addKey(nftKey.publicKey.toString(), { type: "fullAccess" })
    .send();

  // Create Near instance for NFT contract account
  const nftNear = new Near({
    network: {
      networkId: "sandbox",
      rpcUrl: sandbox.rpcUrl,
    },
    privateKey: nftKey.secretKey,
    defaultSignerId: nftAccountId,
    defaultWaitUntil: "FINAL",
  });

  // Deploy contract using the NFT account's key
  await nftNear
    .transaction(nftAccountId)
    .deployContract(nftAccountId, nftWasm)
    .send();

  // Initialize NFT contract (using NFT account's key)
  await nftNear
    .transaction(nftAccountId)
    .functionCall(
      nftAccountId,
      "new_default_meta",
      { owner_id: rootAccountId },
      { gas: "30 Tgas", attachedDeposit: "0 NEAR" }
    )
    .send();

  console.log(`✅ NFT contract deployed at ${nftAccountId}`);

  // Deploy Marketplace contract
  const marketplaceKey = generateKey();
  const marketplaceAccountId = `marketplace.${rootAccountId}`;
  
  console.log(`📦 Deploying Marketplace contract to ${marketplaceAccountId}...`);
  
  // Read the compiled WASM
  const marketplaceWasmPath = join(
    __dirname,
    "../marketplace/target/wasm32-unknown-unknown/release/nft_market_contract.wasm"
  );
  const marketplaceWasm = readFileSync(marketplaceWasmPath);

  // Create account
  await near
    .transaction(rootAccountId)
    .createAccount(marketplaceAccountId)
    .transfer(marketplaceAccountId, "100 NEAR")
    .addKey(marketplaceKey.publicKey.toString(), { type: "fullAccess" })
    .send();

  // Create Near instance for Marketplace contract account
  const marketplaceNear = new Near({
    network: {
      networkId: "sandbox",
      rpcUrl: sandbox.rpcUrl,
    },
    privateKey: marketplaceKey.secretKey,
    defaultSignerId: marketplaceAccountId,
    defaultWaitUntil: "FINAL",
  });

  // Deploy contract using the Marketplace account's key
  await marketplaceNear
    .transaction(marketplaceAccountId)
    .deployContract(marketplaceAccountId, marketplaceWasm)
    .send();

  // Initialize Marketplace contract (using Marketplace account's key)
  await marketplaceNear
    .transaction(marketplaceAccountId)
    .functionCall(
      marketplaceAccountId,
      "new",
      { owner_id: rootAccountId },
      { gas: "30 Tgas", attachedDeposit: "0 NEAR" }
    )
    .send();

  console.log(`✅ Marketplace contract deployed at ${marketplaceAccountId}`);

  return {
    sandbox,
    near,
    rootAccountId,
    rootPrivateKey,
    nftContractId: nftAccountId,
    marketplaceContractId: marketplaceAccountId,
  };
}

/**
 * Clean up test environment
 */
export async function teardownTestEnvironment(ctx: TestContext | undefined): Promise<void> {
  if (!ctx || !ctx.sandbox) {
    console.log("⚠️  No sandbox to tear down");
    return;
  }
  try {
    await ctx.sandbox.tearDown();
    console.log("✅ Sandbox torn down");
  } catch (error) {
    console.error("Error tearing down sandbox:", error);
  }
}

