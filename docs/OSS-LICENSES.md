# OSS-LICENSES.md

This file lists all vendored/open-source components used in the M3tering Protocol Explorer repository, along with their license and obligations.

## Vendored Components

### 1. Rooted Finance (defi4refi/rooted-finance)
- **Source:** https://github.com/defi4refi/rooted-finance
- **License:** AGPL-3.0-only
- **Class:** Copyleft
- **Modules vendored:** RootsToken, RootsStaking, RootsBondPricer, RootsCircuitBreaker, RootsCollateralManager, RootsInverseBond, RootsDeployer, RootsDistributor, RootsDefenseBudget, RootsLiquidationKeeper, RootsPriceFeed, RootsPrice, RootsTreasuryIntegration, TreasuryValuation, TokenRegistry, TokenOnboardingManager, ImpactTokens, ImpactOracleAdapter, MultisigGuard, ReferralRegistry, StakingAdapter, wstROOTS, Bucky, StableSwap.vy, PegKeeperOptimized.vy, and supporting interfaces
- **Obligations:** Derived work inherits AGPL-3.0-only; source must be made available. All license headers preserved.
- **Location:** `contracts/` (Solidity/Vyper), `frontend/` (React/TypeScript)

### 2. M3tering Rollup (M3tering/Rollup)
- **Source:** https://github.com/M3tering/Rollup
- **License:** See upstream repository (SPDX headers preserved per file)
- **Class:** Permissive / See-repo
- **Modules vendored:** Rollup.sol state transition verifier, IRollup.sol, ISP1Verifier.sol interfaces, test files
- **Obligations:** Preserve copyright notices and license headers
- **Location:** `contracts/rollup/`

### 3. M3tering Prover (M3tering/Prover)
- **Source:** https://github.com/M3tering/Prover
- **License:** MIT
- **Class:** Permissive
- **Modules vendored:** Node implementation (lib.rs, main.rs) for SP1 prover client
- **Obligations:** Preserve MIT license header and copyright notice
- **Location:** `src/` (Rust)

### 4. OpenZeppelin Contracts (OpenZeppelin/openzeppelin-contracts)
- **License:** MIT
- **Class:** Permissive
- **Modules used:** ERC20, AccessControl, ReentrancyGuard, Pausable, Governor, UUPS proxies, SafeERC20
- **Obligations:** Keep copyright line; MIT license text included
- **Location:** Vendored via Foundry remappings (not shipped in repo)

### 5. Solady (vectorized/solady)
- **License:** MIT
- **Class:** Permissive
- **Modules used:** LibRLP, gas-optimized primitives
- **Obligations:** MIT license text included
- **Location:** Vendored via Foundry remappings (not shipped in repo)

### 6. Forge-std (foundry-rs/forge-std)
- **License:** MIT OR Apache-2.0
- **Class:** Permissive
- **Modules used:** Test/script toolkit
- **Obligations:** MIT or Apache-2.0 license text included
- **Location:** Vendored via Foundry remappings (not shipped in repo)

## License Summary

| Component | License | Class | Obligations |
|-----------|---------|-------|-------------|
| Rooted Finance | AGPL-3.0-only | Copyleft | Publish source, preserve headers |
| M3tering Rollup | See-repo | Permissive | Preserve headers |
| M3tering Prover | MIT | Permissive | Preserve header |
| OpenZeppelin | MIT | Permissive | Keep copyright line |
| Solady | MIT | Permissive | MIT text included |
| Forge-std | MIT/Apache-2.0 | Permissive | MIT/Apache text included |

## Custom Code

Custom-authored code is kept under 5% of total LOC per the defi4refi policy. See `docs/CUSTOM-CODE-AUDIT.md` and `tools/custom-code.sh` for the audit report.

## Notice

This repository is provided "audit-ready, not audited." Contracts handling real value should receive an external audit before mainnet deployment.