# Quickstart: Encrypted Content Viewer SPA

**Date**: 2026-03-27 | **Branch**: `005-encrypted-viewer-spa`

## Prerequisites

- Node.js >= 20
- pnpm (workspace manager)
- foc-encryption library built (`pnpm run build` from repo root)

## Setup

```bash
# From repo root
cd packages/foc-viewer
pnpm install
```

## Development

```bash
# Start dev server with hot reload
pnpm run dev
```

Opens at `http://localhost:5173`. Test with:
- No fragment: shows manual entry form
- `#url=https://example.com/blob.enc&pw=mypassword`: auto-decrypts
- `#url=https://example.com/blob.enc`: prompts for password

## Build

```bash
# Build static output
pnpm run build
```

Output: `packages/foc-viewer/dist/index.html` (single file or HTML + JS bundle)

## Test

```bash
pnpm run test
```

Runs Vitest unit tests for fragment parsing and content-type detection.

## Usage

1. **Encrypt content** using the CLI demo:
   ```bash
   cd packages/foc-demo
   pnpm run cli encrypt myfile.html --password "secret" --output encrypted.bin
   ```

2. **Host the encrypted blob** on any HTTP server with CORS headers.

3. **Open the viewer** with the fragment:
   ```
   https://your-viewer-domain/#url=https://your-host/encrypted.bin&pw=secret
   ```
