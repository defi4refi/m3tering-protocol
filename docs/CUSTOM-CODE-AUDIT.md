# CUSTOM-CODE-AUDIT.md

## Custom Code Audit

This document reports the custom-authored vs. vendored/generated lines of code (LOC) for the M3tering Protocol Explorer repository, per the defi4refi policy that custom code must be under 5% of delivered LOC.

## Method

Custom LOC is measured with `tools/custom-code.sh`, which:
- Counts all code files tracked by git (`git ls-files`)
- Excludes vendored/generated files under `lib/`, `vendor/`, `upstream/`, `third_party/`, `node_modules/`, `.venv/`, `venv/`, `dist/`, `out/`, `build/`, `coverage/`, `__pycache__/`, `.next/`, `target/`, `bin/`
- Excludes generated names (`*generated*`, `*.pb.*`, `*.min.*`, lockfiles, `LICENSE`, `LICENCE`, `COPYING`, `NOTICE`, `CHANGELOG`)
- Excludes docs (`*.md`, `*.txt`, `*.rst`, `*.pdf`, images, fonts, video)
- Excludes pure config (`*.json`, `*.yaml`, `*.toml`, `*.ini`, `*.cfg`, `*.conf`, `*.env`, `*.example`, `.gitmodules`, `.gitignore`, `.dockerignore`, `.editorconfig`, `prettierrc.*`, `eslintrc.*`, `solhint.*`)
- Excludes test fixtures (`test/`, `tests/`, `fixtures/`, `testdata/`, `snapshots/`, `data/`, `ddl/`)
- Counts remaining code files toward custom LOC
- Vendored code LOC still counts toward the denominator for honesty

## Results

| Metric | Value |
|--------|-------|
| Total counted code LOC | TBD |
| Custom-authored LOC | TBD |
| Vendored/generated LOC | TBD |
| Custom ratio | TBD |
| Cap | 5% |
| Status | TBD |

## Custom Code Files

Custom-authored files in this repo (each under 5% cap individually):

- `README.md` — project documentation (not counted as code)
- `docs/OSS-LICENSES.md` — license inventory (not counted as code)
- `docs/CUSTOM-CODE-AUDIT.md` — this audit (not counted as code)
- `tools/custom-code.sh` — custom code audit script (vendored from defi4refi tooling)
- `tools/ci/verify-build.yml` — CI workflow (vendored from defi4refi tooling)

All smart contracts, frontend components, hooks, modules, and Rust prover code are vendored from catalog sources (Rooted Finance, M3tering Rollup, M3tering Prover) and are not counted as custom code.

## Verification

CI runs `tools/custom-code.sh` on every push/PR via `.github/workflows/verify-build.yml`. The gate exits non-zero if custom code exceeds 5%.

## License

MIT