# M3tering Protocol

A trustless protocol for tracking energy flows for decentralized applications (DAOs).

## Architecture

- **Tier 1 Contracts** – Core protocol primitives (RootsToken, RootsStaking, wstROOTS, TreasuryValuation, RootsBondPricer, RootsInverseBond, RootsCollateralManager, ReferralRegistry, MultisigGuard, RootsCircuitBreaker, RootsDeployer)
- **Tier 2 Frontend** – React/Vite frontend scaffold for the explorer UI
- **Tier 3 Modules** – Rooted monorepo (workers, lexicons, appreciation pipelines), Rooted wallet extension

## Data Sources

- EVM (local chain simulation)
- Waku (oracle feed)
- Streamr (real-world energy data)
- Arweave (immutable storage)

## Getting Started

```bash
# Clone the repo
cd m3tering-protocol

# Run custom-code audit to enforce <5% custom LOC
./tools/custom-code.sh .

# Build contracts
forge build
forge test
```

## License

See [docs/OSS-LICENSES.md](docs/OSS-LICENSES.md) for the full license breakdown.

## Contributing

Contributions must respect the [custom-code-count](tools/custom-code.sh) policy (<5% custom LOC). Additions require:
1. Updated [CUSTOM-CODE-AUDIT.md](docs/CUSTOM-CODE-AUDIT.md)
2. Updated [OSS-LICENSES.md](docs/OSS-LICENSES.md) for any new dependencies
3. Proper license classification per upstream source
