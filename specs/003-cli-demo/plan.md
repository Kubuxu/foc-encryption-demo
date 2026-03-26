# Implementation Plan: CLI Demo for FOC Encryption

**Branch**: `003-cli-demo` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-cli-demo/spec.md`

## Summary

A demonstration CLI tool (`foc-demo`) that integrates the foc-encryption library with `@filoz/synapse-sdk` to encrypt/upload and download/decrypt files on Filecoin Onchain Cloud. Lives in a `demo/` sub-project using pnpm workspaces. Uses `cleye` for CLI parsing and PBKDF2 (Web Crypto) for password-based key derivation.

## Technical Context

**Language/Version**: TypeScript 5.9+, ESM-only (`"type": "module"`)
**Primary Dependencies**: `foc-encryption` (workspace), `@filoz/synapse-sdk`, `cleye`, `viem` (peer of synapse-sdk)
**Storage**: Filecoin Onchain Cloud warm storage via synapse-sdk
**Testing**: vitest (matching parent project)
**Target Platform**: Node.js 20+ (CLI)
**Project Type**: CLI application (demo)
**Performance Goals**: N/A (demo tool, not performance-critical)
**Constraints**: Must work with Filecoin Calibration testnet; assumes user has funded wallet
**Scale/Scope**: Single-user CLI, ~5 commands, ~500-800 lines of source

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Separate sub-project with clear module boundaries |
| II. TDD | PASS | Unit tests for key derivation, CLI argument parsing; integration tests for encrypt/upload/download/decrypt flows (mocked network) |
| III. Testing Standards | PASS | Deterministic tests, no flaky network calls in CI (mock synapse-sdk) |
| IV. UX Consistency | PASS | Consistent flag naming (`--key`, `--password`, `--output`), actionable error messages |
| V. Performance Awareness | PASS | No crypto timing concerns beyond what foc-encryption already handles |
| Dev Workflow | PASS | Feature branch, PR-based |

No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/003-cli-demo/
├── plan.md                    # This file
├── spec.md                    # Feature specification
├── research.md                # Phase 0 research decisions
├── synapse-sdk-research.md    # Synapse SDK API patterns
├── data-model.md              # Phase 1 data model
├── quickstart.md              # Phase 1 usage examples
├── contracts/                 # Phase 1 CLI contract
│   └── cli-contract.md        # Command schemas and flag definitions
└── tasks.md                   # Phase 2 task breakdown
```

### Source Code (repository root)

```text
demo/
├── package.json               # Sub-project config (workspace:* ref to foc-encryption)
├── tsconfig.json              # TypeScript config with project reference to parent
├── README.md                  # Setup, prerequisites, usage examples, PieceCID vs URL
├── src/
│   ├── cli.ts                 # Entry point — cleye setup, command dispatch
│   ├── commands/
│   │   ├── encrypt.ts         # Local encrypt-only command
│   │   ├── decrypt.ts         # Local decrypt-only command
│   │   ├── upload.ts          # Encrypt + upload to FOC
│   │   ├── download.ts        # Download + decrypt from FOC
│   │   └── range.ts           # Range decrypt from FOC (seekable)
│   ├── key.ts                 # Key handling: hex parsing, PBKDF2 derivation, salt management
│   ├── locator.ts             # PieceLocator: parse PieceCID vs HTTP URL, resolve to retrieval URL
│   ├── synapse.ts             # Synapse client factory + BlobFetcher construction
│   └── util.ts                # Shared helpers (progress display, error formatting)
└── tests/
    ├── unit/
    │   ├── key.test.ts        # PBKDF2 derivation, hex key parsing
    │   └── cli.test.ts        # Argument parsing validation
    └── integration/
        ├── encrypt-decrypt.test.ts   # Local round-trip
        └── upload-download.test.ts   # Mocked synapse-sdk round-trip
```

**Structure Decision**: Separate `demo/` sub-project linked via pnpm workspace. This keeps the demo isolated from the library while sharing the build toolchain. The root `pnpm-workspace.yaml` adds `packages: ['.', 'demo']`.
