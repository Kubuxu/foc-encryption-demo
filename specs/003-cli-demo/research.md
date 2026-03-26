# Research: CLI Demo

## R-001: CLI Framework

**Decision**: `cleye`
**Rationale**: Lightweight, type-safe argument parser already used in synapse-sdk examples. Zero heavy dependencies. Auto-generates `--help` and `--version`. Subcommand support via `command()` helper.
**Alternatives considered**:
- `commander` — more features but heavier; unnecessary for a demo
- `yargs` — powerful but large dependency tree
- `citty` — minimal but less ecosystem alignment

## R-002: Password-Based Key Derivation

**Decision**: PBKDF2 via Web Crypto API (`crypto.subtle.deriveBits`)
**Rationale**: Native to Node.js 20+ (no extra dependencies), well-understood security properties. OWASP-recommended 600,000 iterations with SHA-256.
**Alternatives considered**:
- Argon2id — stronger memory-hardness but requires native dependency (`argon2` or `hash-wasm`)
- scrypt — available in Node.js `crypto` but not in Web Crypto API; would break browser compatibility story

**Parameters**:
| Parameter | Value |
|-----------|-------|
| Hash | SHA-256 |
| Iterations | 600,000 |
| Salt | 16 bytes, random |
| Key length | 256 bits |

**Salt storage**: Stored in the COSE envelope's `appMetadata` field under key `"pbkdf2_salt"`. On decryption, read salt from metadata before deriving the key.

## R-003: Sub-Project Structure

**Decision**: pnpm workspace with `demo/` as workspace member
**Rationale**: Clean dependency resolution via `workspace:*` protocol. Matches monorepo conventions. pnpm 10.7.0 already specified in root `packageManager` field.
**Alternatives considered**:
- `file:` path reference — simpler but less robust for development (no hoisting, no lockfile integration)
- Separate repository — overhead not justified for a demo

## R-004: Synapse SDK Integration

**Decision**: Use `@filoz/synapse-sdk` high-level `StorageManager` API
**Rationale**: `synapse.storage.upload()` and `synapse.storage.download()` handle provider selection, commitment, and replication automatically. Lower-level `createContext()` not needed for the demo.
**Alternatives considered**:
- Context-based API — more control but unnecessary complexity for a demo
- Direct HTTP to providers — bypasses SDK benefits

**Authentication**: `viem` `privateKeyToAccount()` with hex private key from CLI flag or environment variable.

## R-005: Encryption Mode Selection

**Decision**: Auto-select based on file size
**Rationale**: Chunked mode (seekable) for files > 256 KiB, simple AES-256-GCM for smaller files. This matches the library's design intent — chunked mode enables range decryption for large files.
**Alternatives considered**:
- Always chunked — unnecessary overhead for small files
- User flag to choose — adds complexity to the demo without clear benefit
- Always simple — loses the seekable demo capability

## R-006: BlobFetcher for Range Decryption

**Decision**: HTTP Range requests via `fetch()` to piece retrieval URL
**Rationale**: The foc-encryption `BlobFetcher` interface (`fetchEnvelope()` + `fetchRange()`) maps directly to HTTP Range headers. Piece URLs obtainable from synapse-sdk upload results or `context.getPieceUrl()`.
**Alternatives considered**:
- Full download + slice — defeats the purpose of range decryption
- Custom transport — unnecessary when HTTP Range is standard
