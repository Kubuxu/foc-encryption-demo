# Implementation Plan: Encrypted Content Viewer SPA

**Branch**: `005-encrypted-viewer-spa` | **Date**: 2026-03-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-encrypted-viewer-spa/spec.md`

## Summary

Build a lightweight static single-page website that fetches, decrypts, and displays foc-encryption encrypted content. The page uses URL fragments (`#url=...&pw=...`) to encode retrieval parameters, ensuring passwords never leave the browser. Supports auto-decrypt from shared links, manual entry, password-only prompts, and link generation for sharing. This is a demo -- minimal code, single HTML output artifact bundled with Vite.

## Technical Context

**Language/Version**: TypeScript 5.9+, ESM-only
**Primary Dependencies**: `foc-encryption` (workspace), Vite (bundler, dev server)
**Storage**: N/A (client-side only, no persistence)
**Testing**: Vitest (unit tests for fragment parsing, content-type detection)
**Target Platform**: Modern browsers (Web Crypto API required)
**Project Type**: Static SPA (demo)
**Performance Goals**: <5s for 1MB content on broadband (per SC-001)
**Constraints**: Single HTML output file (or minimal static assets), no server-side processing
**Scale/Scope**: Single page, ~5 source files, demo-quality

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | Small scope, clear module boundaries, linted by Biome |
| II. TDD (NON-NEGOTIABLE) | PASS with justification | Unit tests for core logic (fragment parsing, content-type sniffing). Browser DOM manipulation tested via integration. TDD cycle applies to testable units; UI rendering is minimal and verified manually. |
| III. Testing Standards | PASS | Deterministic unit tests, no external dependencies in tests |
| IV. UX Consistency | PASS | Error messages are actionable per spec. Follows project conventions. |
| V. Performance Awareness | PASS | No crypto timing concerns (uses Web Crypto API). PBKDF2 runs in browser's native implementation. |

No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/005-encrypted-viewer-spa/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
viewer/
├── package.json         # Workspace package, depends on foc-encryption
├── tsconfig.json        # TypeScript config
├── vite.config.ts       # Vite config (inline single HTML output)
├── index.html           # Entry HTML with minimal UI shell
├── src/
│   ├── main.ts          # Entry point: fragment parsing, mode routing, orchestration
│   ├── fragment.ts      # URL fragment encode/decode (#url=...&pw=...)
│   ├── decrypt.ts       # Fetch blob, derive key via PBKDF2, decrypt with foc-encryption
│   ├── render.ts        # Content-type sniffing, DOM rendering (HTML/image/text/PDF/download)
│   └── ui.ts            # Form creation, error display, loading indicator, clipboard copy
└── tests/
    ├── fragment.test.ts # Fragment encode/decode round-trips, edge cases
    └── render.test.ts   # Content-type detection from magic bytes
```

**Structure Decision**: New `viewer/` workspace package alongside existing `demo/` (CLI). Follows the same pattern: workspace dependency on `foc-encryption`, own tsconfig, own tests. Vite bundles everything into a single HTML file for static hosting.

## Complexity Tracking

No constitution violations to justify.
