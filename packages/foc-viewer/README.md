# foc-viewer

A single-file SPA for viewing encrypted content produced by `foc-encryption`. Build output is a single self-contained `dist/index.html` with all JavaScript inlined — no server required, open it directly in a browser or host it statically.

## Usage

### Auto-decrypt via shared link

Navigate to the viewer with a URL fragment containing both `url` and `pw`:

```
https://example.com/viewer/#url=<blob-url>&pw=<password>
```

The page fetches the encrypted blob, derives the decryption key via PBKDF2, decrypts, and renders content automatically.

### Password prompt

Navigate with only `url` in the fragment — a password prompt is shown:

```
https://example.com/viewer/#url=<blob-url>
```

### Manual entry

Open the viewer with no fragment. Fill in the blob URL and password, then click **View Content** to decrypt or **Copy Link** to copy a shareable URL to the clipboard.

## Supported content types

Detected from magic bytes and rendered inline where possible:

| Type | Rendering |
|------|-----------|
| HTML | Replaces page DOM |
| Images (PNG, JPEG, GIF, WebP) | Centered `<img>` + download link |
| PDF | `<embed>` + download link |
| Plain text | `<pre>` + download link |
| Other binary | Download link only |

## Development

```sh
pnpm dev        # Vite dev server at http://localhost:5173
pnpm build      # Single-file output → dist/index.html
pnpm test       # Vitest unit tests
pnpm typecheck  # TypeScript type-check
```

## How it works

1. `fragment.ts` — parses and builds `#url=...&pw=...` URL fragments
2. `decrypt.ts` — fetches the blob, reads the PBKDF2 salt from the envelope's `appMetadata`, derives the 256-bit CEK (600 000 iterations, SHA-256), and calls `foc-encryption`'s `decrypt`
3. `render.ts` — detects content type from magic bytes and renders accordingly
4. `ui.ts` — minimal DOM helpers for form, password prompt, loading state, and error display
5. `main.ts` — entry point that routes between the three modes on page load

## Encryption format

Blobs must be encrypted with `foc-encryption` and include a `pbkdf2_salt` field in `appMetadata`. Use `foc-demo` to produce compatible blobs.
