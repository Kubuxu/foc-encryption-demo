# Tasks: Move Key Derivation Function to Encryption Library

**Input**: Design documents from `/specs/006-move-kdf-to-lib/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks follow TDD (Red → Green) as required by the constitution. Tests are written and verified to fail before implementation begins.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: User Story 1 — Library Consumer Uses KDF Directly (Priority: P1) 🎯 MVP

**Goal**: `deriveKey`, `KeySource`, and `DerivedKey` are exported from `foc-encryption`. A consumer can derive a CEK from a password using only the library.

**Independent Test**: Import `deriveKey` from `'foc-encryption'` in an isolated script, call it with a known password + salt, and confirm a 32-byte CEK is returned. The `foc-encryption` test suite (`packages/foc-encryption`) passes standalone.

### Tests for User Story 1 (TDD — write and verify FAIL first)

- [X] T001 [US1] Create `packages/foc-encryption/tests/unit/kdf.test.ts`: copy the `hexToBytes` and `deriveKey` describe blocks from `packages/foc-demo/tests/unit/key.test.ts`; update the import to `import { hexToBytes, deriveKey } from '../../src/kdf.js'`
- [X] T002 [US1] Verify T001 tests fail: run `pnpm test` in `packages/foc-encryption` — expected failure is "Cannot find module `../../src/kdf.js`"

### Implementation for User Story 1

- [X] T003 [US1] Create `packages/foc-encryption/src/kdf.ts`: define `KeySource` type and `DerivedKey` interface; add internal (non-exported) `hexToBytes` function; add `export async function deriveKey` — copy implementation verbatim from `packages/foc-demo/src/key.ts`
- [X] T004 [US1] Update `packages/foc-encryption/src/index.ts`: add `export type { KeySource, DerivedKey } from './kdf.js'` and `export { deriveKey } from './kdf.js'` with JSDoc comment "Derive a content encryption key from a password or raw hex material."
- [X] T005 [US1] Verify tests pass: run `pnpm test` in `packages/foc-encryption` — all tests including `kdf.test.ts` green
- [X] T006 [US1] Commit: `feat(foc-encryption): add deriveKey, KeySource, DerivedKey to library`

**Checkpoint**: `foc-encryption` standalone tests pass. Any consumer can now import `deriveKey` from the library.

---

## Phase 2: User Story 2 — CLI Demo Delegates to Library KDF (Priority: P2)

**Goal**: `foc-demo` contains no duplicate KDF logic. All key derivation is imported from `foc-encryption`. Existing CLI behaviour is unchanged.

**Independent Test**: Run `pnpm test` in `packages/foc-demo` — `parseKeySource` tests pass; smoke test confirms `deriveKey` from the library returns a valid CEK.

### Tests for User Story 2 (TDD — smoke test before wiring)

- [X] T007 [US2] Update `packages/foc-demo/tests/unit/key.test.ts`:
  - Remove the `hexToBytes` describe block (moved to `kdf.test.ts`)
  - Remove the `deriveKey` describe block (moved to `kdf.test.ts`)
  - Update the import line: remove `hexToBytes` and `deriveKey` — keep only `parseKeySource`
  - Add a new `describe('smoke — deriveKey from foc-encryption')` block that imports `deriveKey` from `'foc-encryption'` and asserts it returns a 32-byte CEK for a known password + salt
- [X] T008 [US2] Verify T007 smoke test passes (foc-encryption already exports `deriveKey` from Phase 1) and `parseKeySource` tests still pass; confirm no `hexToBytes` or old `deriveKey` tests remain in `foc-demo`

### Implementation for User Story 2

- [X] T009 [US2] Update `packages/foc-demo/src/key.ts`:
  - Add `import { deriveKey, type KeySource, type DerivedKey } from 'foc-encryption'` at the top
  - Remove the local `KeySource` type definition
  - Remove the local `DerivedKey` interface definition
  - Remove the `hexToBytes` function definition
  - Remove the `deriveKey` function definition
  - `parseKeySource` and its existing `hexToBytes` call within it — wait: `parseKeySource` does NOT call `hexToBytes`; only `deriveKey` does. Verify `parseKeySource` still compiles after removing `hexToBytes` locally (it should, since `hexToBytes` is only called inside `deriveKey`)
- [X] T010 [US2] Verify `pnpm test` in `packages/foc-demo` — all tests green (parseKeySource + smoke test)
- [X] T011 [US2] Commit: `refactor(foc-demo): delegate key derivation to foc-encryption library`

**Checkpoint**: `foc-demo` has no duplicate KDF logic. Both packages pass their test suites independently.

---

## Phase 3: Polish & Full Workspace Verification

**Purpose**: Confirm the entire workspace is green and lint-clean after both changes land.

- [X] T012 [P] Run `pnpm test` from workspace root — all packages green
- [X] T013 [P] Run `pnpx biome check .` from workspace root — no lint or format errors
- [X] T014 Run `pnpm lint` from workspace root — passes (no root lint script; covered by T013)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No prerequisites — start immediately
- **Phase 2 (US2)**: Depends on Phase 1 completion (library must export `deriveKey` before demo imports it)
- **Phase 3 (Polish)**: Depends on Phase 1 + Phase 2 completion

### Within Each Phase

- Tests MUST be written and verified to FAIL before implementation (TDD — constitution requirement)
- T003 depends on T002 (tests failing confirmed)
- T004 depends on T003 (module must exist before re-exporting)
- T005 depends on T004 (entry point must be updated before full test run)
- T009 depends on T008 (smoke test must pass before gutting demo's local defs)
- T012/T013/T014 depend on T011 (both commits must land before workspace verification)

### Parallel Opportunities

T012 and T013 are independent checks and can run in parallel.

---

## Parallel Example: Phase 3 Verification

```bash
# Run in parallel — independent checks:
Task T012: pnpm test           # from workspace root
Task T013: pnpx biome check .  # from workspace root
```

---

## Implementation Strategy

### MVP (User Story 1 only)

1. Complete Phase 1 (T001–T006)
2. **STOP and VALIDATE**: `pnpm test` in `packages/foc-encryption` passes standalone
3. Any library consumer can now use `deriveKey` — MVP delivered

### Full Delivery

1. Phase 1 → Phase 2 → Phase 3
2. Each phase ends with a commit; Phase 3 is verification only (no new commit needed)

---

## Notes

- [P] tasks = independent, can run concurrently
- TDD is non-negotiable per the constitution: write test → confirm red → implement → confirm green
- `hexToBytes` is internal to `kdf.ts` — do NOT export it from `index.ts`
- `parseKeySource` stays in `foc-demo/src/key.ts` — it is CLI-specific and not part of the library
- Import paths MUST use `.js` extension (ESM-only project)
- The workspace dep `foc-encryption` is already listed in `foc-demo/package.json` (used for encrypt/decrypt); no `package.json` changes needed
