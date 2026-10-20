# M3tering Protocol Explorer

A ReFi-aligned explorer for the M3tering Protocol, integrating data from EVM, Waku, Streamr, Arweave, and other sources.

## Overview

This repository contains a web application designed to explore and visualize the M3tering Protocol's energy tracking data. It provides comprehensive insights into protocol statistics, individual meter performance, and transaction details.

## Key Features

- **Cumulative protocol stats and graphs**
- **Charts graphing energy usage for each m3ter** (line/bar charts)
- **Charts graphing meter revenues for each m3ter** (line/bar charts)
- **Raw transaction information**
- **User-friendly names and avatars** for m3ters, contracts, and accounts
- **M3ter revenue balances by Chain/L2** (doughnut/pie charts)
- **Tagging activity types**
- **State diff tracker**
- **Rollup state proposals and validity**
- **Real-time data stream** via Streamr or Waku
- **Data decoding and validation tools**
- **Smart contracts interface**
- **Apps directory** (energy payments, m3ter auction/registration, m3ter TBA erc6551, m3trs.m3ter.ing)

## Relevant Documentation

- [M3tering Protocol Documentation](https://docs.m3ter.ing/)
- [Rollup PR](https://github.com/M3tering/Rollup/pull/1)
- [Prover PR](https://github.com/M3tering/Prover/pull/13)
- [Subgraph](https://subgraph.m3ter.ing)

## Inspiration

- [Hotspotty](https://app.hotspotty.net/hotspots/112AhoCZGK8hpWWLy2uEfFEzrW3XiCyh5smMGnZDuTbn61Hw6yg6/rewards)
- [Helium Geek](https://app.heliumgeek.com/hex/88265671e3fffff)
- [Glowstats](https://www.glowstats.xyz/)
- [M3terscan](https://m3terscan.m3ter.ing)
- [State Diff](https://m3terstate-diff.pages.dev)
- [Payload Decoder](https://emmo00.github.io/m3ter-payload-decoder/)
- [M3ter Stream](https://github.com/Emmo00/m3ter-stream)
- [Nouns DAO](https://nouns.build/dao/base/0x09c1d4d80cc86981a67deb76227f13a4dcdd6022/0)

## Selection Rubric

We score applications on:

- **ReFi alignment** (hard gate) — does it plausibly create more for all life?
- **Open-source commitment** (hard gate) — delivered code must ship under an OSI license in a public repo
- **Template fit** — can we adapt our proven contract stack? (higher leverage = more projects served)
- **Maintenance capacity** — who maintains what we hand off?
- **Community need** — underserved region or demographic?
- **Tokenomics sanity** — no ponzinomics, no guaranteed-yield claims

**ReFi alignment:** Creates a path of democratisation of energy infra and enables active participation from communities and individuals.

**License commitment:** MIT

**Team / maintainer:** @ichristwin @emmo00 @IDEA-godwin

**Existing funding:** Grants, auction fees

## Terms

- Delivered code is open source and publicly beneficial — that's the deal.
- Audit-ready, not audited. Contracts handling real value should get an external audit; we provide tests, docs, and invariants to cut that cost.
- **Your team deploys and operates mainnet contracts under your own keys.** defi4refi never custodies or controls live funds infrastructure.
- We may publicly list the engagement, mint a hypercert, and display metrics.
- Either side can exit; work-to-date is published regardless.

## Project Structure

```
.
├── contracts/          # Smart contracts (Rollup, interfaces)
├── docs/              # Documentation
├── frontend/          # Web application
├── tools/             # Custom code audit tools and CI
├── README.md          # This file
└── oss-catalog.yaml   # OSS inventory
```

## Building and Running

### Prerequisites

- Node.js 18+
- pnpm 8+

### Installation

```bash
cd frontend
pnpm install
```

### Development

```bash
cd frontend
pnpm dev
```

### Build

```bash
cd frontend
pnpm build
```

### Testing

```bash
cd frontend
pnpm test
```

## License

MIT

## Contributing

We follow the defi4refi intake process. For questions or clarifications, see the issue comments.