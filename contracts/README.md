# NEAR Contracts

This directory contains the NEAR Protocol smart contracts for the marketplace.

## Structure

```
contracts/
├── nft/              # NFT contract (e.g., NEP-171 standard)
├── marketplace/       # Marketplace contract for trading NFTs
├── package.json      # Contract dependencies and scripts
└── README.md         # This file
```

## Contracts

- **NFT Contract**: Manages NFT minting, transfers, and ownership
- **Marketplace Contract**: Handles NFT listings, purchases, and trading

## Local Development (Sandbox)

For local development, we use NEAR Sandbox to spin up a local NEAR network:

```bash
# Start sandbox and deploy contracts
bun contracts:deploy:local

# Stop sandbox
bun contracts:stop:local
```

## Production Deployment

Contracts are deployed to testnet/mainnet using environment variables:

```bash
# Deploy to testnet
NODE_ENV=testnet bun contracts:deploy

# Deploy to mainnet
NODE_ENV=mainnet bun contracts:deploy
```

## Configuration

Contract IDs are configured in `bos.config.json`:

- **Development**: Uses local sandbox contract IDs
- **Testnet**: Uses testnet contract IDs (from env or config)
- **Mainnet**: Uses mainnet contract IDs (from env or config)

## Environment Variables

Set these in your `.env` file:

```bash
# Testnet
NEAR_TESTNET_NFT_CONTRACT_ID=nft.testnet.near
NEAR_TESTNET_MARKETPLACE_CONTRACT_ID=marketplace.testnet.near

# Mainnet
NEAR_MAINNET_NFT_CONTRACT_ID=nft.near
NEAR_MAINNET_MARKETPLACE_CONTRACT_ID=marketplace.near

# Local Sandbox (auto-generated, but can override)
NEAR_SANDBOX_RPC_URL=http://localhost:3030
```

