# foc-encryption Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-26

## Active Technologies
- TypeScript 5.9+, ESM-only (`"type": "module"`) + `foc-encryption` (workspace), `@filoz/synapse-sdk`, `cleye`, `viem` (peer of synapse-sdk) (003-cli-demo)
- Filecoin Onchain Cloud warm storage via synapse-sdk (003-cli-demo)

- TypeScript 5.9+, ESM-only (`"type": "module"`) + `cborg` (CBOR encoding/decoding), Web Crypto API (AES-256-GCM) (001-encryption-envelope-lib)

## Project Structure

```text
src/
tests/
```

## Commands

npx biome check . && npm test && npm run lint

## Code Style

TypeScript 5.9+, ESM-only (`"type": "module"`): Follow standard conventions

## Recent Changes
- 003-cli-demo: Added TypeScript 5.9+, ESM-only (`"type": "module"`) + `foc-encryption` (workspace), `@filoz/synapse-sdk`, `cleye`, `viem` (peer of synapse-sdk)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
