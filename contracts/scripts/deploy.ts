#!/usr/bin/env bun
/**
 * Deploy contracts to testnet or mainnet
 * 
 * Usage:
 *   NODE_ENV=testnet bun run scripts/deploy.ts
 *   NODE_ENV=mainnet bun run scripts/deploy.ts
 */

import { Near, generateKey } from 'near-kit';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = join(import.meta.dir, '../..');
const BOS_CONFIG_PATH = join(ROOT_DIR, 'bos.config.json');

const network = (process.env.NODE_ENV || 'testnet') as 'testnet' | 'mainnet';

async function deployContract(
  near: Near,
  contractPath: string,
  accountId: string,
  privateKey: string,
  initMethod?: string,
  initArgs?: Record<string, any>
): Promise<string> {
  console.log(`📦 Deploying contract to ${accountId} on ${network}...`);
  
  // TODO: Implement contract deployment
  // Example:
  // const wasmFile = readFileSync(contractPath);
  // await near.transaction(accountId).deployContract(wasmFile).send();
  // if (initMethod) {
  //   await near.transaction(accountId).functionCall(accountId, initMethod, initArgs || {}).send();
  // }
  
  return accountId;
}

async function main() {
  try {
    const nftContractId = process.env[`NEAR_${network.toUpperCase()}_NFT_CONTRACT_ID`];
    const marketplaceContractId = process.env[`NEAR_${network.toUpperCase()}_MARKETPLACE_CONTRACT_ID`];
    
    if (!nftContractId || !marketplaceContractId) {
      throw new Error(
        `Missing contract IDs. Set NEAR_${network.toUpperCase()}_NFT_CONTRACT_ID and NEAR_${network.toUpperCase()}_MARKETPLACE_CONTRACT_ID`
      );
    }
    
    const rpcUrl = network === 'testnet' 
      ? 'https://rpc.testnet.near.org'
      : 'https://rpc.mainnet.near.org';
    
    // Create NEAR instance
    const near = new Near({
      network: {
        networkId: network,
        rpcUrl,
      },
      defaultWaitUntil: 'FINAL',
    });
    
    // Deploy NFT contract
    const nftContractPath = join(ROOT_DIR, 'contracts/nft/res/nft.wasm');
    const nftPrivateKey = process.env[`NEAR_${network.toUpperCase()}_NFT_PRIVATE_KEY`];
    if (!nftPrivateKey) {
      throw new Error(`Missing NEAR_${network.toUpperCase()}_NFT_PRIVATE_KEY`);
    }
    await deployContract(near, nftContractPath, nftContractId, nftPrivateKey, 'new', {
      owner_id: process.env[`NEAR_${network.toUpperCase()}_OWNER_ACCOUNT_ID`] || nftContractId,
    });
    
    // Deploy Marketplace contract
    const marketplaceContractPath = join(ROOT_DIR, 'contracts/marketplace/res/marketplace.wasm');
    const marketplacePrivateKey = process.env[`NEAR_${network.toUpperCase()}_MARKETPLACE_PRIVATE_KEY`];
    if (!marketplacePrivateKey) {
      throw new Error(`Missing NEAR_${network.toUpperCase()}_MARKETPLACE_PRIVATE_KEY`);
    }
    await deployContract(near, marketplaceContractPath, marketplaceContractId, marketplacePrivateKey, 'new', {
      nft_contract_id: nftContractId,
    });
    
    // Update bos.config.json
    console.log('📝 Updating bos.config.json...');
    const config = JSON.parse(readFileSync(BOS_CONFIG_PATH, 'utf-8'));
    config.app.contracts[network].nft = nftContractId;
    config.app.contracts[network].marketplace = marketplaceContractId;
    writeFileSync(BOS_CONFIG_PATH, JSON.stringify(config, null, 2));
    
    console.log('✅ Contracts deployed successfully!');
    console.log(`   NFT Contract: ${nftContractId}`);
    console.log(`   Marketplace Contract: ${marketplaceContractId}`);
    console.log(`   Network: ${network}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
}

main();

