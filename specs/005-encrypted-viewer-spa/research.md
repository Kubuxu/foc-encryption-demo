# Research: Encrypted Content Viewer SPA

**Date**: 2026-03-27 | **Branch**: `005-encrypted-viewer-spa`

## R1: Browser Compatibility of foc-encryption

**Decision**: foc-encryption is fully browser-compatible -- no polyfills needed.

**Rationale**: The library uses only Web Crypto API (`globalThis.crypto.subtle`), standard `Uint8Array`, and `cborg` (pure JS CBOR library). No `node:` imports, no `Buffer` usage, no filesystem APIs. Confirmed by inspecting all source files in `src/`.

**Alternatives considered**: None needed. If Node.js APIs were present, we'd need Vite polyfill plugins.

## R2: PBKDF2 Key Derivation from Password

**Decision**: Reuse the key derivation logic from `packages/foc-demo/src/key.ts` in the viewer.

**Rationale**: The demo already implements PBKDF2 key derivation using Web Crypto API:
- 600,000 iterations, SHA-256, 16-byte random salt, 256-bit output
- Salt is stored in the COSE envelope's `appMetadata.pbkdf2_salt`
- Same code works in browser without modification

**Alternatives considered**: Could import from demo package, but that brings in CLI dependencies. Better to extract the ~20 lines of key derivation directly into the viewer.

## R3: Fetching Encrypted Blobs in the Browser

**Decision**: For the demo, fetch the entire blob at once with a simple `fetch()` call. Do not implement `BlobFetcher` / range requests.

**Rationale**: The `BlobFetcher` interface (HTTP Range-based partial fetching) is designed for seekable decryption of large files. For this demo viewer, the full blob is needed for display anyway, so a single `fetch()` + `decrypt()` is simpler and sufficient. The existing `decrypt(blob, cek)` function accepts a full `Uint8Array`.

**Alternatives considered**: Implementing `BlobFetcher` with HTTP Range headers. Deferred -- adds complexity without benefit for a demo that displays the entire decrypted content.

## R4: Bundler Choice

**Decision**: Use Vite to bundle the viewer into a single HTML file (or HTML + one JS bundle).

**Rationale**: Vite is lightweight, handles TypeScript natively, resolves workspace dependencies, and can inline assets. The existing project already uses Vitest (Vite-based), so Vite is a natural fit. The `vite-plugin-singlefile` plugin can inline all JS/CSS into a single HTML file if desired.

**Alternatives considered**:
- esbuild directly: Faster but requires manual HTML assembly
- No bundler (script tags): Would require pre-building foc-encryption and cborg as browser bundles

## R5: Content-Type Detection via Magic Bytes

**Decision**: Implement a minimal magic-byte sniffer supporting: PNG, JPEG, GIF, WebP, PDF, and fallback to UTF-8 text detection (valid UTF-8 → text/plain, otherwise application/octet-stream). HTML detected by checking for `<!DOCTYPE` or `<html` prefix after UTF-8 decode.

**Rationale**: Covers the most common shareable content types with minimal code (~30 lines). No external library needed. Matches spec requirement FR-014.

**Alternatives considered**:
- `file-type` npm package: Full magic-byte library, but heavy for a demo
- Content-Type from HTTP response headers: Not available -- the retrieval URL serves an encrypted blob, not the original content type
