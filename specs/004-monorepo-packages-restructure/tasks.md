# Tasks: Monorepo Packages Restructure

**Input**: Design documents from `/specs/004-monorepo-packages-restructure/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the target directory structure before any files are moved.

- [x] T001 Create `packages/foc-encryption/` directory in repository root
- [x] T002 Create `packages/foc-demo/` directory in repository root

---

## Phase 2: Foundational (Move Source Files)

**Purpose**: Physically relocate all source and config files using `git mv` to preserve history. MUST complete before any configuration updates.

**⚠️ CRITICAL**: No user story configuration work can begin until all moves are complete.

- [x] T003 `git mv src packages/foc-encryption/src` — move library source tree
- [x] T004 `git mv tests packages/foc-encryption/tests` — move library test tree
- [x] T005 [P] `git mv tsconfig.json packages/foc-encryption/tsconfig.json` — move library TypeScript config
- [x] T006 [P] `git mv vitest.config.ts packages/foc-encryption/vitest.config.ts` — move library test runner config
- [x] T007 Copy root `package.json` content to `packages/foc-encryption/package.json` — create library package manifest (content identical to current root package.json; the root copy will be replaced in Phase 3)
- [x] T008 `git mv demo packages/foc-demo` — move entire demo directory (preserves demo/src, demo/tests, demo/package.json, demo/tsconfig.json, demo/vitest.config.ts, demo/README.md as a unit)

**Checkpoint**: All source files are in their new locations. No config changes yet — builds will be broken until Phase 3.

---

## Phase 3: User Story 1 — Root workspace builds and tests pass (Priority: P1) 🎯 MVP

**Goal**: `pnpm install && pnpm -r build && pnpm -r test` all succeed from the repository root.

**Independent Test**: A freshly cloned repo can install, build both packages, and pass all tests without any per-package navigation.

### Implementation for User Story 1

- [x] T009 [US1] Update `pnpm-workspace.yaml` — replace `packages: ['.', 'demo']` with `packages: ['packages/*']`
- [x] T010 [US1] Rewrite root `package.json` to workspace shell — retain `packageManager`, `engines`, `pnpm.onlyBuiltDependencies`; add `private: true`; remove `name`, `version`, `description`, `exports`, `files`, `sideEffects`, `dependencies`, `devDependencies`, `wireit`, `scripts.build/test/lint/typecheck`; add `scripts` entry `"build": "pnpm -r build"`, `"test": "pnpm -r test"`
- [x] T011 [US1] Run `pnpm install` from repo root to re-establish workspace symlinks after manifest changes
- [x] T012 [US1] Verify `pnpm -r build` succeeds — both `packages/foc-encryption/dist/` and `packages/foc-demo/dist/` are produced
- [x] T013 [US1] Verify `pnpm -r test` passes — all existing tests green with zero failures

**Checkpoint**: User Story 1 complete — workspace builds and all tests pass from the root.

---

## Phase 4: User Story 2 — Library builds and tests in isolation (Priority: P2)

**Goal**: `cd packages/foc-encryption && pnpm build && pnpm test` succeeds without involving the demo package.

**Independent Test**: Running build and test from within `packages/foc-encryption/` produces `dist/` output and passes all library tests, with no cross-package side effects.

### Implementation for User Story 2

- [ ] T014 [US2] Verify `pnpm build` from `packages/foc-encryption/` compiles only the library and outputs to `packages/foc-encryption/dist/`
- [ ] T015 [US2] Verify `pnpm test` from `packages/foc-encryption/` runs only the library test suite and passes

> These are verification tasks — no file changes needed if US1 is correctly implemented. If either check fails, fix the library's `package.json` or `tsconfig.json` in `packages/foc-encryption/`.

**Checkpoint**: User Story 2 complete — library is independently buildable and testable.

---

## Phase 5: User Story 3 — Demo resolves library via workspace (Priority: P2)

**Goal**: `packages/foc-demo` builds against the local workspace `foc-encryption` without a registry lookup, and wireit incremental dependency is intact.

**Independent Test**: Building the demo from `packages/foc-demo/` resolves `foc-encryption` from the workspace symlink, and a change to the library triggers a rebuild of the demo via wireit.

### Implementation for User Story 3

- [x] T016 [US3] Update `packages/foc-demo/package.json` wireit build dependency — change `"../: build"` to `"../foc-encryption: build"` in `wireit.build.dependencies`
- [ ] T017 [US3] Verify `pnpm build` from `packages/foc-demo/` resolves `foc-encryption` from workspace (`node_modules/foc-encryption` is a symlink to `packages/foc-encryption`)
- [ ] T018 [US3] Verify wireit incremental build — confirm `packages/foc-demo` build re-runs when a file in `packages/foc-encryption/src/` is touched

**Checkpoint**: User Story 3 complete — workspace dependency chain is fully functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentation accuracy and final validation across all stories.

- [ ] T019 [P] Update `packages/foc-demo/README.md` — replace `demo/dist/cli.js` with `packages/foc-demo/dist/cli.js`; replace `../README.md` link with the correct relative path to the repo root README (`../../README.md`)
- [ ] T020 [P] Run `pnpm exec biome check .` from repo root — confirm no new lint errors introduced by moved or updated files
- [ ] T021 Run full end-to-end verification from repo root: `pnpm install && pnpm -r build && pnpm -r test && pnpm exec biome check .`
- [ ] T022 Confirm root `package.json` has no `exports`, `files`, or `src/`/`dist/` references (validates SC-005 from spec)
- [ ] T023 Commit all changes with a descriptive commit message referencing this feature branch

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — creates target dirs before `git mv`
- **US1 (Phase 3)**: Depends on Phase 2 — config updates require files in place
- **US2 (Phase 4)**: Depends on Phase 3 — library isolation is verifiable only after workspace is wired
- **US3 (Phase 5)**: Depends on Phase 3 (workspace links must exist); can run concurrently with US2
- **Polish (Phase 6)**: Depends on Phases 4 and 5

### User Story Dependencies

- **US1 (P1)**: Unblocked after Foundational — this is the MVP
- **US2 (P2)**: Unblocked after US1 — verification-only, no additional files
- **US3 (P2)**: Unblocked after US1 — can proceed in parallel with US2

### Parallel Opportunities within Phases

- T005 and T006 (Phase 2): tsconfig.json and vitest.config.ts moves are independent
- T014 and T015 (Phase 4): build verify and test verify can run in parallel
- T019 and T020 (Phase 6): README update and biome check are independent

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (create dirs)
2. Complete Phase 2: Foundational (git mv all source files)
3. Complete Phase 3: US1 (update workspace config, install, verify)
4. **STOP and VALIDATE**: `pnpm install && pnpm -r build && pnpm -r test` all pass
5. Proceed to US2/US3 once MVP is confirmed

### Incremental Delivery

1. Phase 1 + 2: Files moved — workspace broken but history preserved
2. Phase 3 (US1): Workspace restored and fully functional — MVP ✓
3. Phase 4 (US2): Library isolation confirmed — structural goal validated ✓
4. Phase 5 (US3): Demo dependency chain verified — all acceptance criteria met ✓
5. Phase 6: Polish + commit

---

## Notes

- `git mv` is mandatory for all moves to preserve `git log --follow` history
- T007 creates `packages/foc-encryption/package.json` as a copy of the root manifest; T010 then strips the root copy to a workspace shell — do not do these in reverse order
- T008 moves `demo/` as a unit — no need to `git mv` individual files inside it
- US2 and US3 tasks (T014–T018) are primarily verification steps; if Phase 3 is implemented correctly they should pass without additional code changes
- Commit once after Phase 6 T023 rather than per-task, since intermediate states (files moved but configs not updated) leave the workspace in a broken state
