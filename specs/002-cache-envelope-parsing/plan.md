# Implementation Plan: Cache Envelope Parsing for decryptRange

**Branch**: `002-cache-envelope-parsing` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-cache-envelope-parsing/spec.md`

## Summary

Refactor `decryptRange` to require pre-parsed envelope metadata instead of fetching and parsing the envelope internally. Remove the `Uint8Array` code path (callers with full blobs use `decrypt` instead). Extend `EnvelopeMetadata` (or introduce a new type) to include `protectedHeaders`, which `decryptRange` needs but `parseEnvelope` does not currently expose. Make `parseEnvelope` accept a `BlobFetcher` (async) in addition to `Uint8Array`.

## Technical Context

**Language/Version**: TypeScript 5.9+, ESM-only (`"type": "module"`)
**Primary Dependencies**: `cborg` (CBOR encoding/decoding), Web Crypto API (AES-256-GCM)
**Storage**: N/A
**Testing**: `vitest` (via `npm test`)
**Target Platform**: Any JS runtime with Web Crypto (Node.js, Deno, browsers)
**Project Type**: Library
**Performance Goals**: Eliminate redundant envelope fetches on repeated `decryptRange` calls
**Constraints**: Constant-time crypto where timing side-channels are a concern; zero key buffers after use
**Scale/Scope**: Small library, ~15 source files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Single-responsibility: `decryptRange` stops doing envelope parsing. Public API documented. |
| II. TDD (NON-NEGOTIABLE) | PASS | Tests written first for new `decryptRange` signature; existing seekable tests migrated. |
| III. Testing Standards | PASS | All public API surfaces tested. Integration tests verify BlobFetcher path. |
| IV. UX Consistency | PASS | Breaking change is intentional and documented. Error messages remain actionable. |
| V. Performance Awareness | PASS | Core goal is eliminating redundant work. No timing side-channel changes. |
| Security | PASS | CEK still imported and zeroed per call. `protectedHeaders` is read-only metadata. |

No violations. Complexity Tracking not needed.

## Project Structure

### Documentation (this feature)

```text
specs/002-cache-envelope-parsing/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── decryptRange-contract.md
└── tasks.md
```

### Source Code (repository root)

```text
src/
├── envelope.ts              # decryptRange, parseEnvelope — primary changes
├── types.ts                 # EnvelopeMetadata type — add protectedHeaders
├── index.ts                 # Exports — no new exports needed
├── schemes/
│   └── chunked-aes-256-gcm.ts  # No changes (decryptRange method unchanged)
└── cose/
    └── decode.ts            # No changes (already returns protectedHeaders)

tests/
└── integration/
    └── seekable.test.ts     # Migrate to new decryptRange signature
```

**Structure Decision**: Single project, existing layout. Changes are confined to `envelope.ts`, `types.ts`, and test files. No new files in `src/`.
