# Contract Tests

End-to-end tests for NFT and Marketplace contracts using `near-sandbox-js` and `near-kit`.

## Prerequisites

1. **Build the contracts** before running tests:
   ```bash
   bun run build:all
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

## Running Tests

### Run all tests
```bash
bun test
```

### Run specific test suites
```bash
# NFT contract tests only
bun test tests/nft.test.ts

# Marketplace contract tests only
bun test tests/marketplace.test.ts
```

## Test Structure

- **`setup.ts`**: Test environment setup and teardown
  - Starts a NEAR sandbox
  - Deploys NFT and Marketplace contracts
  - Provides test context with configured Near instances

- **`nft.test.ts`**: NFT contract tests
  - Contract initialization
  - NFT minting
  - NFT transfers
  - Token queries

- **`marketplace.test.ts`**: Marketplace contract tests
  - Storage management
  - Listing NFTs for sale
  - Purchasing NFTs
  - Price updates

## How It Works

1. **Sandbox**: Each test suite starts a fresh NEAR sandbox instance
2. **Deployment**: Contracts are automatically deployed to the sandbox
3. **Testing**: Tests use `near-kit` to interact with contracts via the sandbox RPC
4. **Cleanup**: Sandbox is torn down after tests complete

## Test Accounts

Tests create the following accounts:
- `test.near` - Root account (contract owner)
- `alice.test.near` - Seller account
- `bob.test.near` - Buyer account

## Notes

- Tests use `defaultWaitUntil: "FINAL"` to ensure transactions are fully processed
- Storage costs are estimated (you may need to adjust based on actual contract storage)
- Some tests include delays to allow cross-contract calls to complete

