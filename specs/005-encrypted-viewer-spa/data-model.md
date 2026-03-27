# Data Model: Encrypted Content Viewer SPA

**Date**: 2026-03-27 | **Branch**: `005-encrypted-viewer-spa`

This is a stateless client-side application. There is no persistent data model. Below are the runtime data structures.

## Entities

### FragmentParams

Parsed from the URL fragment `#url=...&pw=...`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | Retrieval URL for the encrypted blob |
| password | string | No | Password for key derivation |

### PageMode

Derived from `FragmentParams` on page load. Determines which UI to show.

| Value | Condition | UI Behavior |
|-------|-----------|-------------|
| `auto-decrypt` | url + password present | Fetch, decrypt, display automatically |
| `password-prompt` | url present, no password | Show password input with URL read-only |
| `manual-entry` | no fragment or malformed | Show full form (URL + password fields) |

### DetectedContentType

Result of magic-byte sniffing on decrypted data.

| Value | Detection Method | Render Strategy |
|-------|-----------------|-----------------|
| `text/html` | `<!DOCTYPE` or `<html` prefix | Replace page DOM |
| `image/png` | Magic bytes `89 50 4E 47` | Centered `<img>` in wrapper |
| `image/jpeg` | Magic bytes `FF D8 FF` | Centered `<img>` in wrapper |
| `image/gif` | Magic bytes `47 49 46 38` | Centered `<img>` in wrapper |
| `image/webp` | Magic bytes `52 49 46 46...57 45 42 50` | Centered `<img>` in wrapper |
| `application/pdf` | Magic bytes `25 50 44 46` | `<embed>` or `<iframe>` in wrapper |
| `text/plain` | Valid UTF-8, no HTML markers | `<pre>` in wrapper |
| `application/octet-stream` | Fallback | Download link |

### DecryptResult

Output of the fetch-and-decrypt pipeline.

| Field | Type | Description |
|-------|------|-------------|
| data | Uint8Array | Decrypted plaintext bytes |
| contentType | string | Detected MIME type from magic bytes |

## State Transitions

```
Page Load
  │
  ├─ fragment has url+pw ──→ AUTO-DECRYPT ──→ LOADING ──→ DISPLAY / ERROR
  │
  ├─ fragment has url only ──→ PASSWORD-PROMPT ──→ (submit) ──→ LOADING ──→ DISPLAY / ERROR
  │
  └─ no fragment / malformed ──→ MANUAL-ENTRY
       │
       ├─ "View Content" ──→ LOADING ──→ DISPLAY / ERROR
       │
       └─ "Copy Link" ──→ LINK-COPIED (clipboard + confirmation)
```
