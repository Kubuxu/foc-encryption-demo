# Research: Encryption Envelope Library

**Feature**: 001-encryption-envelope-lib
**Date**: 2026-03-26

## R-001: CBOR Library Selection

**Decision**: `cborg`
**Rationale**:
- `decodeFirst()` returns `[value, remainder]` — critical for FR-015/FR-016 (parsing self-delimiting COSE envelope from front of blob, treating remainder as ciphertext). Neither `cbor-x` nor `cbor2` offer this.
- Deterministic encoding aligns with content-addressed systems in the Filecoin/IPFS ecosystem.
- Authored by Rod Vagg, used throughout IPLD/Protocol Labs tooling — same ecosystem.
- Zero dependencies, pure JS, works in browsers natively with Uint8Array.
- ~200k npm weekly downloads, actively maintained (v4.3.2).

**Alternatives considered**:
- `cbor-x`: 3-10x faster but lacks `decodeFirst`. Performance irrelevant for small COSE envelopes.
- `cbor2`: New, lacks partial decode equivalent. Requires Node 20+.

## R-002: COSE Library vs. Manual Construction

**Decision**: Build COSE structures manually on top of `cborg`
**Rationale**:
- No existing JS/TS COSE library supports all requirements: COSE_Encrypt + COSE_Encrypt0, detached payloads, private-use algorithm IDs, custom header parameters.
- `cose-js`: Stale (last release Sep 2023), no TS, poor documentation for custom alg IDs.
- `@mattrglobal/cose`: Incomplete, Sign1 only — no Encrypt support.
- `@ldclabs/cose-ts`: Encrypt0 only, no multi-recipient Encrypt.
- COSE structures are simple CBOR arrays per RFC 9052:
  - `COSE_Encrypt0 = [protected: bstr, unprotected: map, ciphertext: bstr/nil]` (Tag 16)
  - `COSE_Encrypt = [protected: bstr, unprotected: map, ciphertext: bstr/nil, recipients: [+COSE_recipient]]` (Tag 96)
- Thin COSE layer (~200-400 lines) gives full control, no dependency risk.

**Alternatives considered**:
- `cose-js`, `@mattrglobal/cose`, `@ldclabs/cose-ts`, `@transmute/cose` — all insufficient.

## R-003: Testing Framework

**Decision**: `vitest`
**Rationale**:
- Native ESM + TypeScript support out of the box (esbuild-based).
- Jest-compatible API (`describe`, `it`, `expect`), zero learning curve.
- ~4-10x faster than Jest in cold runs, 10-20x in watch mode.
- Browser mode available for Web Crypto verification.
- Modern, actively maintained by Vite/VoidZero ecosystem.

**Alternatives considered**:
- `jest`: Slower, requires configuration for ESM/TS. Jest 30 closed gap but Vitest still preferred for new TS projects.
- `playwright-test` + `chai` (synapse-sdk pattern): More complex setup; warranted for SDK with heavy browser testing, but overkill for a crypto library that primarily needs Web Crypto API testing.

**Note**: synapse-sdk uses `playwright-test` + `chai` + `msw`. We diverge here because our library has simpler browser testing needs — vitest's browser mode suffices for verifying Web Crypto compatibility.

## R-004: Build Tooling

**Decision**: Plain `tsc` via `wireit` for task orchestration, ESM-only output
**Rationale**:
- Follows synapse-sdk pattern exactly: `tsc --build --pretty` wrapped in wireit for incremental builds, dependency ordering, and caching.
- Wireit manages the build→lint→test dependency graph (e.g., lint depends on build, test depends on lint).
- ESM-only (`"type": "module"`) — Node 18+ has solid ESM support, all modern browsers use ESM, Filecoin/IPFS ecosystem has moved to ESM-only.
- No bundler complexity for a library — consumers bundle as needed.

**Wireit config pattern** (from synapse-core):
```json
"wireit": {
  "build": {
    "command": "tsc --build --pretty",
    "clean": "if-file-deleted",
    "files": ["src/**/*.ts", "tsconfig.json"],
    "output": ["dist/**"]
  },
  "test": {
    "command": "vitest run",
    "files": ["src/**/*.ts", "tests/**/*.ts"],
    "output": [],
    "dependencies": ["lint"]
  },
  "lint": {
    "command": "biome check .",
    "files": ["src/**/*.ts", "tests/**/*.ts", "biome.json"],
    "output": [],
    "dependencies": ["build"]
  }
}
```

**Alternatives considered**:
- `tsdown`/`tsup`: Fastest builds but unnecessary for a library — adds a dependency for no benefit when `tsc` suffices.
- Dual CJS/ESM: Adds complexity, dual-package hazard risk, not needed for target ecosystem.
- No wireit: Loses incremental build caching and dependency graph management that synapse-sdk relies on.

## R-005: Linting & Formatting

**Decision**: `biome`
**Rationale**:
- Follows synapse-sdk pattern exactly.
- Single tool replaces ESLint + Prettier — faster, simpler config.
- Synapse settings: 2-space indent, single quotes, no semicolons, trailing commas es5, kebab-case filenames, 120 char line width.

**Alternatives considered**:
- ESLint + Prettier: More ecosystem support but two tools, slower, more config.

## R-006: COSE Private-Use Algorithm ID for Chunked AEAD

**Decision**: Use `-65793` for Chunked-AES-256-GCM-STREAM
**Rationale**:
- IANA COSE Algorithms registry reserves integers < -65536 for private use.
- Offset from the start of the range to avoid collision with projects that naively pick -65537 or round numbers like -66000.
- Sequential block starting at -65790 for header params, -65793 for algorithm ID (same block, separate registry).
- Document clearly in spec; request official value in Specification Required range (-65536 to -257) alongside FRC.

**Alternatives considered**:
- -65537 (first private-use value): Too obvious, likely collision target.
- Round numbers (-66000, -70000): Same problem.

## R-007: COSE Custom Header Parameters and Application Metadata

**Decision**: Private-use header labels starting at `-65790`:
- `-65790`: `chunk_size` (uint, bytes per chunk)
- `-65791`: `chunk_count` (uint, total number of chunks)
- `-65792`: `app_metadata` (CBOR map with string keys for application-level metadata)

The `app_metadata` map uses string keys for readability (it's our own structure, not a COSE header map):
- `"cid"`: optional plaintext CID (bstr)
- (future application fields added here)

**Rationale**:
- Header parameters < -65536 are private use (separate registry from algorithms — no collision with algorithm ID -65793).
- Sequential from -65790, offset from range start to avoid collision with naive picks (-65537) and round numbers.
- `chunk_count` kept in the envelope: useful when only the envelope is available (e.g., `BlobFetcher` path) without needing the full blob length.
- Application metadata grouped in a single map (`-65792`) rather than individual labels per field — cleaner separation of scheme params vs app metadata, extensible without burning more allocations.
- Inner map uses string keys (`"cid"`) for readability — these are not COSE header labels, just keys in our application-defined CBOR map.
- When standardizing via FRC, request labels in the appropriate IANA range.

## R-008: STREAM Construction for Chunked AEAD

**Decision**: Follow STREAM construction (Hoang et al., 2015) with age-style nonce layout
**Rationale**:

The STREAM construction encrypts data in fixed-size chunks with per-chunk AEAD, deriving unique nonces from chunk index and a last-chunk flag.

**Nonce layout (12 bytes for AES-256-GCM)**:
```
nonce_i = base_nonce[0..7] XOR (chunk_index as 4-byte BE || last_flag as 1-byte)
         [-------7 bytes-------]  [----4 bytes----]  [1 byte]
```
- `base_nonce` (7 bytes): random, generated per encryption, stored in envelope
- `chunk_index` (4 bytes): big-endian counter, 0-indexed
- `last_flag` (1 byte): `0x00` for non-final, `0x01` for final chunk

This is a hybrid of Tink's approach (random prefix + counter + flag) adapted to 12-byte GCM nonces. The 4-byte counter supports up to 2^32 chunks (at 256 KiB default = 1 PiB max file size).

**Per-chunk authentication protects against**:
- Tampering (AEAD tag verification)
- Reordering (counter bound in nonce)
- Truncation (last-chunk flag in nonce)
- Insertion/duplication (counter sequence + final flag)

**Alternatives considered**:
- age style (11-byte counter + 1-byte flag): Counter is excessive for our use case, wastes nonce space.
- Tink style (7-byte prefix + 4-byte counter + 1-byte flag): Close to our choice, but Tink also uses HKDF key derivation per message which adds complexity. We store the random nonce prefix directly.

## R-009: COSE Envelope Versioning

**Decision**: Layered approach — algorithm ID for crypto versioning, `typ` header (RFC 9596, label 16) for envelope identification
**Rationale**:
- Algorithm ID already determines processing logic — any change to nonce derivation, chunk construction, or AEAD gets a new algorithm ID.
- `typ` header parameter (protected, label 16) identifies the envelope as FOC encryption: e.g., `"application/vnd.foc-envelope+cose"`.
- No custom version header preemptively — YAGNI. Can be added later if needed.

**Alternatives considered**:
- Custom version header parameter: Over-engineering for now.
- Algorithm ID alone: Doesn't distinguish FOC envelopes from other COSE objects.

## R-010: Web Crypto API — AES-256-GCM

**Decision**: Use Web Crypto API exclusively for all cryptographic operations
**Rationale**:
- AES-256-GCM available in Node.js 19+ (stable) and all modern browsers.
- Consistent async API (`Promise`-based) in both environments.

**Key constraints**:
- IV must be exactly 96 bits (12 bytes) for GCM per NIST SP 800-38D.
- Tag length defaults to 128 bits (use this always).
- Web Crypto `encrypt()` returns `ciphertext || tag` concatenated.
- Always pass `additionalData` explicitly (empty ArrayBuffer if no AAD).
- All operations are async — API must propagate this.
- Use `crypto.subtle.importKey('raw', ..., 'AES-GCM', false, [...])` with `extractable: false`.
- `crypto.getRandomValues()` for nonce generation — available everywhere.

## R-011: Synapse SDK Patterns to Follow

**Decision**: Align with synapse-sdk conventions where applicable
**Rationale**: Ecosystem consistency with the FOC SDK.

**Patterns adopted**:
- pnpm with `"packageManager"` field in package.json (corepack)
- ESM-only (`"type": "module"`)
- Plain `tsc` for builds
- Biome for linting/formatting (same settings)
- Strict TypeScript (`strict: true`, `verbatimModuleSyntax`, `erasableSyntaxOnly`)
- Kebab-case filenames
- `"exports"` field with `"types"` + `"import"` conditions
- `"sideEffects": false`
- Apache-2.0 OR MIT dual license

**Patterns diverged**:
- Testing: vitest instead of playwright-test+chai (simpler for crypto library)
- No monorepo/workspaces initially (single package, can grow later)
- Node.js >=20 minimum (not >=22, to support broader adoption for a library)
