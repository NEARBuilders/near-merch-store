# NEAR Smart Contract Migration Guide: SDK 4.x to 5.x

This guide documents the complete migration process of a 4-year-old Near smart contract from SDK 4.0.0-pre.7 to 5.17.0, including all challenges encountered and solutions implemented.

## Overview

**Original Contract**: Price Oracle contract (4 years old)  
**From**: near-sdk 4.0.0-pre.7, Rust edition 2018  
**To**: near-sdk 5.17.0, Rust edition 2021  
**Testing Framework**: Migrated from near-sdk-sim to near-workspaces

## 1. Cargo.toml Updates

### Basic Dependencies
```toml
# Before
edition = "2018"
near-sdk = "=4.0.0-pre.7"
near-sys = "=0.1"

# After
edition = "2021"
near-sdk = "5.17.0"
near-sdk-macros = "5.17.0"
borsh = "1.5.7"
serde_json = "1.0"
```

### Dev Dependencies for Testing
```toml
[dev-dependencies]
near-sdk = { version = "5.17.0", features = ["unit-testing"] }
near-workspaces = "0.21.0"
approx = "0.5"
tokio = { version = "1.0", features = ["full"] }
anyhow = { version = "1.0" }
```

**Key Points:**
- Remove `near-sys` dependency (no longer needed)
- Add `borsh` explicitly (required for serialization)
- Use `unit-testing` feature for near-sdk in dev-dependencies
- Replace `near-sdk-sim` with `near-workspaces`

## 2. Core SDK Changes

### Import Updates
```rust
// Before
use near_sdk::{
    assert_one_yocto, env, ext_contract, log, near_bindgen, AccountId, Balance, Gas, 
    PanicOnDefault, Promise, Timestamp, ONE_NEAR, BorshStorageKey, Duration,
};

// After
use near_sdk::{
    assert_one_yocto, env, ext_contract, log, near, AccountId, NearToken, Gas, 
    Promise, Timestamp, BorshStorageKey, Duration,
};
```

### Type Replacements
```rust
// Balance → NearToken
// Before
const NO_DEPOSIT: Balance = 0;
const SAFETY_MARGIN_NEAR_CLAIM: Balance = ONE_NEAR;

// After
const NO_DEPOSIT: NearToken = NearToken::from_yoctonear(0);
const SAFETY_MARGIN_NEAR_CLAIM: NearToken = NearToken::from_near(1);

// Gas API Changes
// Before
const GAS_FOR_PROMISE: Gas = Gas(Gas::ONE_TERA.0 * 10);

// After
const GAS_FOR_PROMISE: Gas = Gas::from_tgas(10);
```

### Macro Changes
```rust
// Before
#[near_bindgen]
pub struct Contract {
    // ...
}

#[near_bindgen]
impl Contract {
    // ...
}

// After
#[near(contract_state)]
pub struct Contract {
    // ...
}

#[near]
impl Contract {
    // ...
}
```

## 3. Serialization Changes

### Remove Custom Serialization
```rust
// Before - Custom serialization modules
pub(crate) mod u128_dec_format {
    use near_sdk::serde::de;
    use near_sdk::serde::{Deserialize, Deserializer, Serializer};
    // ... custom serialization logic
}

// Usage
#[serde(with = "u64_dec_format")]
pub last_report: Timestamp,

// After - Direct types
pub last_report: Timestamp,
```

**Key Points:**
- Remove custom `u64_dec_format` and `u128_dec_format` modules
- Use direct `u128` and `u64` types instead of string serialization
- The `#[near]` macros handle ABI generation automatically

### JsonSchema Handling
```rust
// Before - Explicit JsonSchema derives
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, schemars::JsonSchema)]

// After - Remove JsonSchema (handled by #[near] macros)
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize)]
```

## 4. Contract State Management

### Default Implementation
```rust
// Before
#[derive(PanicOnDefault)]
pub struct Contract {
    // ...
}

// After
impl Default for Contract {
    fn default() -> Self {
        Self {
            oracles: UnorderedMap::new(StorageKey::Oracles),
            assets: UnorderedMap::new(StorageKey::Assets),
            recency_duration_sec: 0,
            owner_id: "".parse().unwrap(),
            near_claim_amount: NearToken::from_yoctonear(0),
        }
    }
}
```

### Versioned Structs
```rust
// Add Clone derives for versioned structs
#[derive(BorshSerialize, BorshDeserialize, Serialize, Deserialize, Clone)]
pub struct Asset {
    // ...
}

// Implement From traits for versioned structs
impl From<&VAsset> for Asset {
    fn from(v: &VAsset) -> Self {
        match v {
            VAsset::V0(c) => c.clone().into(),
            VAsset::Current(c) => c.clone(),
        }
    }
}
```

## 5. External Contract Calls

### Promise API Changes
```rust
// Before
ext_price_receiver::oracle_on_call(
    sender_id,
    price_data,
    msg,
    receiver_id,
    NO_DEPOSIT,
    Gas::from_gas(remaining_gas - GAS_FOR_PROMISE.as_gas()),
);

// After
Promise::new(receiver_id)
    .function_call(
        "oracle_on_call".to_string(),
        serde_json::to_vec(&(sender_id, price_data, msg)).unwrap(),
        NO_DEPOSIT,
        Gas::from_gas(remaining_gas - GAS_FOR_PROMISE.as_gas()),
    )
```

## 6. Gas and Balance Arithmetic

### Gas Operations
```rust
// Before
let remaining_gas = env::prepaid_gas() - env::used_gas();
Gas::from_gas(remaining_gas - GAS_FOR_PROMISE.as_gas())

// After
let remaining_gas = env::prepaid_gas().as_gas() - env::used_gas().as_gas();
Gas::from_gas(remaining_gas - GAS_FOR_PROMISE.as_gas())
```

### Balance Operations
```rust
// Before
let liquid_balance = env::account_balance() + env::account_locked_balance()
    - env::storage_byte_cost() * u128::from(env::storage_usage());

// After
let liquid_balance = env::account_balance().as_yoctonear() + env::account_locked_balance().as_yoctonear()
    - env::storage_byte_cost().as_yoctonear() * u128::from(env::storage_usage());
```

## 7. Testing Migration: near-sdk-sim to near-workspaces

### Cargo.toml for Testing
```toml
[dev-dependencies]
near-sdk = { version = "5.17.0", features = ["unit-testing"] }
near-workspaces = "0.21.0"
tokio = { version = "1.0", features = ["full"] }
anyhow = "1.0"
```

### Test Structure
```rust
use near_workspaces::{Account, AccountId, Contract, Worker};
use near_workspaces::types::{Gas, NearToken};
use serde_json::json;

async fn setup_test_env() -> anyhow::Result<(Worker, Account, Account, Account, Contract)> {
    let worker = near_workspaces::sandbox().await?;
    let owner = worker.dev_create_account().await?;
    let oracle = worker.dev_create_account().await?;
    let user = worker.dev_create_account().await?;
    
    let contract = owner
        .deploy(&worker, "res/price_oracle.wasm".as_bytes())
        .await?
        .into_contract();
    
    Ok((worker, owner, oracle, user, contract))
}
```

### JSON Serialization in Tests
```rust
// Before - String values (WRONG)
"multiplier": "1000000000000000000000000000"

// After - Numeric values (CORRECT)
"multiplier": 1000000000000000000000000000u128
```

### Account Permissions in Tests
```rust
// Oracle functions must be called by oracle account
let result = oracle
    .call(contract.id(), "add_asset")
    .args_json(json!({
        "asset_id": "wrap.near",
        "emas": []
    }))
    .deposit(NearToken::from_yoctonear(1))
    .transact()
    .await?;
```

## 8. Common Compilation Errors and Solutions

### Error: "Use cargo near build instead of cargo build"
**Solution**: Install and use `cargo-near` for contract compilation
```bash
cargo install cargo-near
cargo near build
```

### Error: "proc_macro_crate::crate_name call error: Could not find borsh"
**Solution**: Add explicit borsh dependency
```toml
[dependencies]
borsh = "1.5.7"
```

### Error: "no associated item named ONE_TERA found for struct Gas"
**Solution**: Use new Gas API
```rust
// Before
Gas(Gas::ONE_TERA.0 * 10)
// After
Gas::from_tgas(10)
```

### Error: "cannot find attribute near_bindgen"
**Solution**: Replace with new macros
```rust
// Before
#[near_bindgen]
// After
#[near(contract_state)] // for struct
#[near] // for impl
```

### Error: "TempDir::keep() method not found" in tests
**Solution**: Use stable near-workspaces version
```toml
near-workspaces = "0.21.0"  # Avoid unstable features
```

### Error: "invalid number at line 1 column 91" in JSON
**Solution**: Use numeric types instead of strings
```rust
// Before
"multiplier": "1000000000000000000000000000"
// After
"multiplier": 1000000000000000000000000000u128
```

## 9. Migration Checklist

- [ ] Update `Cargo.toml` dependencies and edition
- [ ] Replace `Balance` with `NearToken`
- [ ] Update Gas API usage
- [ ] Replace `#[near_bindgen]` with `#[near(contract_state)]` and `#[near]`
- [ ] Remove `PanicOnDefault` and add `Default` implementation
- [ ] Remove custom serialization modules
- [ ] Update external contract calls to use Promise API
- [ ] Fix gas and balance arithmetic
- [ ] Add Clone derives to versioned structs
- [ ] Implement From traits for versioned structs
- [ ] Remove explicit JsonSchema derives
- [ ] Set up near-workspaces testing
- [ ] Fix JSON serialization in tests
- [ ] Ensure proper account permissions in tests
- [ ] Test all contract functionality

## 10. Building and Testing

### Build Contract
```bash
cargo near build
```

### Run Tests
```bash
cargo test --test workspace_tests
```

### Check for Issues
```bash
cargo check --target wasm32-unknown-unknown
```

## 11. Key Takeaways

1. **Breaking Changes**: SDK 5.x has significant breaking changes - plan for substantial refactoring
2. **Type Safety**: New types like `NearToken` provide better type safety
3. **Testing**: near-workspaces is more powerful but requires different setup
4. **Serialization**: Custom serialization is often unnecessary in SDK 5.x
5. **Gas API**: New Gas API is more intuitive but requires updates
6. **Account Permissions**: Be careful about which account calls which functions in tests

## 12. Resources

- [NEAR SDK 5.x Documentation](https://docs.near.org/sdk/rust)
- [near-workspaces Documentation](https://docs.rs/near-workspaces/)
- [Migration Examples](https://github.com/near/near-sdk-rs/tree/master/examples)

---

**Migration Completed**: Successfully migrated 4-year-old price oracle contract with comprehensive test coverage using near-workspaces.
