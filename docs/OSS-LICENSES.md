# OSS Licenses for M3tering Protocol

| Repository | License | Class | Purpose |
|------------|---------|-------|---------|
| defi4refi/rooted-finance | AGPL-3.0 | copyleft | Core contract library (RootsToken, RootsStaking, etc.) |
| defi4refi/abyayala | AGPL-3.0 | copyleft | Secondary contract patterns |
| defi4refi/localchimera | custom-copyright | copyleft | Cashu/ecash + Casper experiments |
| defi4refi/rooted-finance frontend | AGPL-3.0 | copyleft | React/Vite frontend scaffold |
| defi4refi/village-os | MIT | permissive | Community/admin UI patterns |
| defi4refi/Rooted | AGPL-3.0 | copyleft | Monorepo for workers, lexicons, appreciation pipeline |
| defi4refi/rooted-wallet-extension | copyleft | copyleft | Wallet-side integrations |

All vendored components must be listed with license and obligations in this file.

## Custom Code Auditing

The custom-code-gate workflow (`verify-build.yml`) enforces a <5% custom LOC ratio by comparing vendored/generated code against the total codebase.

## Contribution Guidelines

1. Use only approved upstream contracts (listed above) as modular components.
2. Maintain AGPL-3.0 compliance for copyleft libraries.
3. Add new contributions to `docs/CUSTOM-CODE-AUDIT.md` with license classification.
4. Ensure `docs/OSS-LICENSES.md` is updated with every added dependency.
