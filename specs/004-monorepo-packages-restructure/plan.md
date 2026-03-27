# Implementation Plan: Monorepo Packages Restructure

**Branch**: `004-monorepo-packages-restructure` | **Date**: 2026-03-27 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-monorepo-packages-restructure/spec.md`

## Summary

Move the `foc-encryption` library (currently at the repo root) and the `foc-demo` CLI (currently at `demo/`) into a `packages/` directory, making both workspace members under `packages/foc-encryption/` and `packages/foc-demo/` respectively. The repo root becomes a workspace shell. No source logic changes — only filesystem moves and configuration updates.

## Technical Context

**Language/Version**: TypeScript 5.9+, Node.js ≥ 20
**Primary Dependencies**: pnpm 10 workspaces, wireit (incremental builds), biome (lint/format), vitest (tests)
**Storage**: N/A
**Testing**: vitest (per-package), biome check (workspace-wide)
**Target Platform**: Developer tooling (monorepo structure)
**Project Type**: Monorepo workspace reorganization
**Performance Goals**: N/A (structural change only)
**Constraints**: Zero test regressions; git history preserved via `git mv`
**Scale/Scope**: 2 packages, ~20 source files total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | PASS | No new code; structural move only |
| II. TDD | PASS | Existing tests are the acceptance criteria; no new features introduced |
| III. Testing Standards | PASS | All existing tests preserved; coverage cannot decrease as no code changes |
| IV. UX Consistency | PASS | CLI API and library API unchanged |
| V. Performance Awareness | PASS | N/A |
| Development Workflow | PASS | Standard PR workflow applies |

No violations. Complexity table not required.

## Project Structure

### Documentation (this feature)

```text
specs/004-monorepo-packages-restructure/
├── plan.md              # This file
├── research.md          # Phase 0 — decisions documented
├── data-model.md        # Phase 1 — before/after workspace topology
├── quickstart.md        # Phase 1 — developer quickstart
├── contracts/
│   └── package-exports.md   # Phase 1 — foc-encryption export contract baseline
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root — after restructure)

```text
packages/
├── foc-encryption/
│   ├── src/             ← moved from <root>/src/
│   ├── tests/           ← moved from <root>/tests/
│   ├── dist/            ← build output (gitignored)
│   ├── package.json     ← library manifest (publishable)
│   ├── tsconfig.json    ← moved from <root>/tsconfig.json
│   └── vitest.config.ts ← moved from <root>/vitest.config.ts
└── foc-demo/
    ├── src/             ← moved from demo/src/
    ├── tests/           ← moved from demo/tests/
    ├── dist/            ← build output (gitignored)
    ├── package.json     ← demo manifest (private)
    ├── tsconfig.json    ← moved from demo/tsconfig.json
    ├── vitest.config.ts ← moved from demo/vitest.config.ts
    └── README.md        ← moved from demo/README.md, paths updated

biome.json               ← stays at root (workspace-wide coverage)
pnpm-workspace.yaml      ← updated: packages: ['packages/*']
package.json             ← becomes workspace shell (private: true, no exports)
```

**Structure Decision**: Single monorepo with `packages/*` glob. The root is a coordination point only — no publishable package at the root.

## Implementation Phases

### Phase A: Move files with git mv

1. Create `packages/` directory
2. Move library: `git mv src tests tsconfig.json vitest.config.ts` into `packages/foc-encryption/`; copy root `package.json` to `packages/foc-encryption/package.json` (content preserved)
3. Move demo: `git mv demo packages/foc-demo`
4. Remove root-level `src/`, `tests/`, `tsconfig.json`, `vitest.config.ts` (consumed by git mv)

### Phase B: Update configuration files

1. **`pnpm-workspace.yaml`**: Replace `['.', 'demo']` with `['packages/*']`
2. **Root `package.json`**: Strip to workspace shell (remove name, exports, files, sideEffects, dependencies, devDependencies, wireit; add `private: true`)
3. **`packages/foc-demo/package.json`**: Change wireit build dependency from `"../: build"` to `"../foc-encryption: build"`
4. **`packages/foc-demo/README.md`**: Update path references (`demo/dist/cli.js` → `packages/foc-demo/dist/cli.js`, `../README.md` → `../../README.md`)
5. **`biome.json`**: Verify `files.ignore` still covers `dist/**` and `node_modules/**` for subdirectories (biome resolves relative to config file location — no change needed)

### Phase C: Verify

1. `pnpm install` from root — workspace links re-established
2. `pnpm -r build` — both packages build
3. `pnpm -r test` — all tests pass
4. `pnpm exec biome check .` — no lint errors
5. Confirm `packages/foc-demo/dist/cli.js` resolves `foc-encryption` from workspace

## Key File Changes Summary

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | `packages: ['.', 'demo']` → `packages: ['packages/*']` |
| `package.json` (root) | Stripped to workspace shell, `private: true` added |
| `packages/foc-encryption/package.json` | Copy of original root package.json (unchanged) |
| `packages/foc-demo/package.json` | wireit dep: `../: build` → `../foc-encryption: build` |
| `packages/foc-demo/README.md` | Path references updated |
| All `src/`, `tests/`, config files | Moved via `git mv`, no content changes |
