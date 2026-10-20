# Custom Code Audit

Track percentage of locally authored vs. vendored/generated LOC across the M3tering Protocol codebase.

## Audit Criteria

- **Custom code**: Source files not under the approved `oss-catalog.yaml` lineage.
- **Vendored code**: Files under `lib/`, `vendor/`, `upstream/`, `third_party/`, `node_modules/`.
- **Generated code**: Files with `.pb.*`, `.min.*`, `package-lock.*`, etc.
- **Documents**: Markdown, text, rst, pdf, etc.
- **Configs**: JSON, YAML, TOML, INI, etc.

## Current Status

```
Total LOC:  (to be determined)
Custom LOC:  (>=5% → FAIL)
Vendored LOC:   
Generated LOC:  

Custom Ratio: <5% (PASS) or >=5% (FAIL)
```

## Recent Changes

- [ ] Review new module additions
- [ ] Update custom-code-gate thresholds
- [ ] Document license obligations per contribution
