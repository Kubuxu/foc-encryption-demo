# Implementation Plan: Move Key Derivation Function to Encryption Library

**Branch**: `006-move-kdf-to-lib` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-move-kdf-to-lib/spec.md`

## Summary

Move the PBKDF2-based `deriveKey` function, its `KeySource`/`DerivedKey` types, and the internal `hexToBytes` helper from `packages/foc-demo/src/key.ts` into a new `packages/foc-encryption/src/kdf.ts` module. Export `deriveKey`, `KeySource`, and `DerivedKey` from the library's public entry point. Update `foc-demo` to import from the library. Relocate KDF unit tests to `foc-encryption`; add a smoke test in `foc-demo`.

## Technical Context

**Language/Version**: TypeScript 5.9+, ESM-only (`"type": "module"`)
**Primary Dependencies**: `foc-encryption` (workspace), `vitest` (tests), `biome` (lint/format), `wireit` (incremental builds)
**Storage**: N/A
**Testing**: vitest
**Target Platform**: Node.js ≥ 20, browser (Web Crypto API)
**Project Type**: library (foc-encryption) + CLI demo (foc-demo)
**Performance Goals**: No change — PBKDF2 parameters locked at 600k iterations
**Constraints**: ESM-only imports; `.js` extension required in all import paths
**Scale/Scope**: 2 packages affected; ~60 lines moved + ~20 lines changed

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ Pass | New `kdf.ts` has single responsibility; no dead code introduced |
| II. TDD | ✅ Pass | KDF tests pre-exist; they move to `foc-encryption` before implementation is wired |
| III. Testing Standards | ✅ Pass | Unit tests in library + smoke test in demo; no test logic changes |
| IV. UX Consistency | ✅ Pass | No user-facing CLI change |
| V. Performance | ✅ Pass | PBKDF2 is already Web Crypto (constant-time internally); no regression |
| Dev Workflow | ✅ Pass | Atomic commit per phase, CI must pass |

No violations. Complexity Tracking table not required.

## Project Structure

### Documentation (this feature)

```text
specs/006-move-kdf-to-lib/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── kdf-api.md       ← Phase 1 output
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code Changes

```text
packages/foc-encryption/
├── src/
│   ├── kdf.ts           ← NEW: KeySource, DerivedKey, hexToBytes (internal), deriveKey
│   └── index.ts         ← MODIFIED: add exports for deriveKey, KeySource, DerivedKey
└── tests/
    └── unit/
        └── kdf.test.ts  ← NEW: moved hexToBytes + deriveKey tests from foc-demo

packages/foc-demo/
├── src/
│   └── key.ts           ← MODIFIED: remove local defs, import from foc-encryption
└── tests/
    └── unit/
        └── key.test.ts  ← MODIFIED: remove hexToBytes + deriveKey suites; add smoke test
                                      parseKeySource tests remain
```

## Implementation Phases

### Phase 1: Add KDF to foc-encryption (TDD — tests first)

1. Create `packages/foc-encryption/src/kdf.ts` with the types and function stubs (fail-state).
2. Create `packages/foc-encryption/tests/unit/kdf.test.ts` by moving the `hexToBytes` and `deriveKey` describe blocks from `foc-demo/tests/unit/key.test.ts`. Update import path to `../../src/kdf.js`. Verify tests fail.
3. Implement `kdf.ts` fully (copy implementation from demo). Verify tests pass.
4. Update `packages/foc-encryption/src/index.ts` to export `deriveKey`, `KeySource`, `DerivedKey` from `./kdf.js`.
5. Run `pnpm test` in `packages/foc-encryption` — all tests green.

**Commit**: `feat(foc-encryption): add deriveKey, KeySource, DerivedKey to library`

### Phase 2: Update foc-demo to use library KDF

1. Update `packages/foc-demo/src/key.ts`:
   - Remove `KeySource`, `DerivedKey`, `hexToBytes`, `deriveKey` definitions.
   - Add imports: `import { deriveKey, type KeySource, type DerivedKey } from 'foc-encryption'`.
   - `parseKeySource` stays; it creates `KeySource` objects — no logic change needed.
2. Update `packages/foc-demo/tests/unit/key.test.ts`:
   - Remove the `hexToBytes` and `deriveKey` describe blocks (moved to library).
   - Remove `hexToBytes` from the import line.
   - Add a smoke test: import `deriveKey` from `'foc-encryption'` and verify it returns a 32-byte CEK for a known password + salt.
3. Run `pnpm test` in `packages/foc-demo` — all tests green.
4. Run `pnpx biome check .` — no lint/format errors.

**Commit**: `refactor(foc-demo): delegate key derivation to foc-encryption library`

### Phase 3: Full workspace verification

1. Run `pnpm test` from workspace root — all packages green.
2. Run `pnpx biome check .` from workspace root — clean.
3. Verify `pnpm lint` passes.

**Commit**: none (verification only — previous commits cover all changes)

## Risk & Mitigations

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Import path issues (`.js` extension) | Low | Follow existing pattern in `foc-encryption/src/index.ts` |
| `foc-demo` `package.json` workspace dep missing | Low | `foc-encryption` is already a workspace dependency of `foc-demo` (used elsewhere) |
| wireit cache serving stale build | Low | `pnpm build` before test run resolves this |
