# Implementation Plan: Encryption Envelope Library

**Branch**: `001-encryption-envelope-lib` | **Date**: 2026-03-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-encryption-envelope-lib/spec.md`

## Summary

Build a TypeScript library (`foc-encryption`) that provides COSE-based encryption envelopes for content-addressed data in the Filecoin on-chain cloud ecosystem. The library handles symmetric AEAD encryption (AES-256-GCM) with both simple (single-shot) and seekable (chunked STREAM construction) modes, producing a detached COSE envelope concatenated with ciphertext. Key management is pluggable via a recipient interface. Targets Node.js 20+ and modern browsers via Web Crypto API.

## Technical Context

**Language/Version**: TypeScript 5.9+, ESM-only (`"type": "module"`)
**Package Manager**: pnpm 10.x (matching synapse-sdk)
**Primary Dependencies**: `cborg` (CBOR encoding/decoding), Web Crypto API (AES-256-GCM)
**Storage**: N/A (library produces `Uint8Array` blobs)
**Testing**: vitest
**Linting/Formatting**: biome (matching synapse-sdk: 2-space indent, single quotes, no semicolons, kebab-case filenames)
**Build**: Plain `tsc` via `wireit` for incremental builds and task orchestration (matching synapse-sdk)
**Target Platform**: Node.js 20+ and modern browsers (Web Crypto API)
**Project Type**: Library (npm package)
**Performance Goals**: Deferred per constitution v1.1.0. Constant-time crypto and buffer zeroing are security requirements, not performance targets.
**Constraints**: Must work in both Node.js and browser runtimes. All crypto operations are async (Web Crypto). Upload data type: `Uint8Array | ReadableStream`. Download: HTTP Range requests or `Promise<Uint8Array>`.
**Scale/Scope**: Single npm package, 5 user stories, ~2000-3000 lines of library code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Biome enforces formatting/linting. Public APIs documented. Single-responsibility modules. |
| II. TDD (NON-NEGOTIABLE) | PASS | Tasks will follow red-green-refactor. Failing tests written before implementation. |
| III. Testing Standards | PASS | Unit tests for all public APIs. Contract tests for COSE envelope interop (SC-004). Integration tests for encrypt/decrypt round-trips. Deterministic tests (no flaky crypto — fixed seeds for test vectors). |
| IV. UX Consistency | PASS | FR-009 mandates distinct, actionable errors. Consistent async API. Semantic versioning. |
| V. Performance Awareness | PASS | Constant-time not applicable to AES-GCM (handled by Web Crypto platform implementation). Memory zeroing per FR-012. No CI benchmark gates per constitution v1.1.0. |
| Development Workflow | PASS | PR-based workflow. Atomic commits. Branch naming follows convention. |

**Pre-design gate: PASSED** — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/001-encryption-envelope-lib/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── public-api.ts    # TypeScript interface definitions
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── index.ts             # Public API re-exports
├── types.ts             # Core type definitions
├── errors.ts            # Error classes (FR-009)
├── cose/
│   ├── encode.ts        # COSE envelope construction (COSE_Encrypt, COSE_Encrypt0)
│   ├── decode.ts        # COSE envelope parsing (decodeFirst-based)
│   ├── headers.ts       # Header parameter constants and helpers
│   └── structures.ts    # Enc_structure (AAD) computation
├── schemes/
│   ├── scheme.ts        # Encryption scheme interface
│   ├── aes-256-gcm.ts   # Simple (non-seekable) AES-256-GCM (COSE alg 3)
│   └── chunked-aes-256-gcm.ts  # Seekable chunked STREAM construction
├── envelope.ts          # High-level encrypt/decrypt orchestration
├── blob.ts              # Blob assembly/parsing (envelope + ciphertext)
├── recipients.ts        # Recipient/key-management descriptor interface
├── key-utils.ts         # Key import, zeroing, validation
└── crypto.ts            # Web Crypto abstraction (getRandomValues, subtle)

tests/
├── unit/
│   ├── cose/
│   │   ├── encode.test.ts
│   │   ├── decode.test.ts
│   │   └── structures.test.ts
│   ├── schemes/
│   │   ├── aes-256-gcm.test.ts
│   │   └── chunked-aes-256-gcm.test.ts
│   ├── blob.test.ts
│   ├── errors.test.ts
│   └── key-utils.test.ts
├── integration/
│   ├── encrypt-decrypt.test.ts    # Round-trip tests
│   ├── seekable.test.ts           # Range decryption
│   └── multi-recipient.test.ts    # Multiple key management descriptors
└── contract/
    └── cose-interop.test.ts       # COSE structure validity (SC-004)
```

**Structure Decision**: Single project (no monorepo). Library code in `src/`, tests in `tests/`. Follows synapse-sdk conventions for package.json exports, biome config, and TypeScript settings. Can become a workspace package later if a demo app is added.

## Constitution Check (Post-Design)

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Clear module boundaries: cose/, schemes/, top-level orchestration. Each file has single responsibility. |
| II. TDD | PASS | Test structure mirrors source. All public APIs have corresponding test files. |
| III. Testing Standards | PASS | Three test tiers: unit (all public APIs), integration (round-trips), contract (COSE interop). Deterministic via fixed test vectors. |
| IV. UX Consistency | PASS | Typed error classes in errors.ts. Consistent async patterns. |
| V. Performance Awareness | PASS | Web Crypto handles constant-time internally. key-utils.ts handles zeroing. |

**Post-design gate: PASSED** — no violations.

## Complexity Tracking

> No constitution violations requiring justification.
