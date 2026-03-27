# foc-encryption Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-27

## Active Technologies
- TypeScript 5.9+, ESM-only (`"type": "module"`) + `foc-encryption` (workspace), `@filoz/synapse-sdk`, `cleye`, `viem` (peer of synapse-sdk) (003-cli-demo)
- Filecoin Onchain Cloud warm storage via synapse-sdk (003-cli-demo)
- TypeScript 5.9+, Node.js ≥ 20 + pnpm 10 workspaces, wireit (incremental builds), biome (lint/format), vitest (tests) (004-monorepo-packages-restructure)
- TypeScript 5.9+, ESM-only (`"type": "module"`) + `cborg` (CBOR encoding/decoding), Web Crypto API (AES-256-GCM) (001-encryption-envelope-lib)

## Project Structure

```text
packages/foc-encryption/  — encryption envelope library
packages/foc-demo/        — CLI demo (encrypt/decrypt/upload/download)
```

## Commands

pnpx biome check . && pnpm test && pnpm lint

## Code Style

TypeScript 5.9+, ESM-only (`"type": "module"`): Follow standard conventions

## Recent Changes
- 004-monorepo-packages-restructure: Added TypeScript 5.9+, Node.js ≥ 20 + pnpm 10 workspaces, wireit (incremental builds), biome (lint/format), vitest (tests)
- 003-cli-demo: Added TypeScript 5.9+, ESM-only (`"type": "module"`) + `foc-encryption` (workspace), `@filoz/synapse-sdk`, `cleye`, `viem` (peer of synapse-sdk)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
