# Research: Monorepo Packages Restructure

## Decision 1: Root package.json role after restructure

**Decision**: The root `package.json` becomes a pure workspace shell — no `name`, no `exports`, no `files`, no publishable metadata. It retains only the `packageManager`, `engines`, `private: true`, and workspace-level `scripts` (build-all, test-all, lint-all) delegating to pnpm `--filter` or `--recursive`.

**Rationale**: pnpm workspaces expect the root to be a coordination point. Publishing from the root of a workspace is an anti-pattern in pnpm; each publishable package must be its own workspace member.

**Alternatives considered**:
- Keep root as the library package and add `packages/*` alongside it. Rejected: this is the current non-pattern; having `.` and `demo` in the workspace is what we're moving away from.

---

## Decision 2: pnpm-workspace.yaml glob

**Decision**: Replace the explicit list (`.` and `demo`) with a single glob `packages/*`.

**Rationale**: A glob is the standard pnpm workspace convention and automatically covers new packages added in the future without updating the workspace file.

**Alternatives considered**:
- Explicit list (`packages/foc-encryption`, `packages/foc-demo`). Rejected: less maintainable than a glob; offers no benefit for this project size.

---

## Decision 3: biome.json and root tsconfig.json placement

**Decision**: `biome.json` stays at the repository root and continues to apply workspace-wide (biome supports monorepos natively by scanning subdirectories). The root `tsconfig.json` is removed since each package already has its own self-contained `tsconfig.json`; no shared base is needed given the identical compiler options.

**Rationale**: biome's `files.ignore` already excludes `node_modules`, `dist`, etc. Moving it into each package would create duplication. TypeScript packages are self-contained and don't reference each other's types directly (the demo depends on the library's emitted `.d.ts` via the workspace, not via `paths`).

**Alternatives considered**:
- Shared root tsconfig that packages extend. Rejected: current tsconfigs are already identical and simple; introducing inheritance adds indirection for no gain.

---

## Decision 4: wireit inter-package dependency path

**Decision**: The demo's wireit build dependency changes from `"../: build"` (relative reference to the workspace root) to `"../foc-encryption: build"` (relative reference to the sibling package).

**Rationale**: wireit uses relative paths between packages to express dependencies. At the new depth `packages/foc-demo`, the library is a sibling at `../foc-encryption`.

**Alternatives considered**:
- Absolute paths. Not supported by wireit.
- Dropping the wireit dependency. Rejected: would break incremental builds that rebuild the demo only when the library changes.

---

## Decision 5: git history preservation

**Decision**: Use `git mv` for all file moves to preserve history with standard git blame/log.

**Rationale**: `git mv` records the rename in the index, so `git log --follow` can trace file history across the move. For directories, `git mv demo packages/foc-demo` works directly. For moving root-level source into `packages/foc-encryption`, each subdirectory is moved individually with `git mv`.

**Alternatives considered**:
- Copy + delete. Rejected: breaks `git log --follow` unless `-M` similarity detection kicks in, which is heuristic.

---

## Decision 6: demo README path reference update

**Decision**: The demo README's reference to `demo/dist/cli.js` and `../README.md` must be updated to reflect the new paths (`packages/foc-demo/dist/cli.js` and `../../README.md` or just the repo root).

**Rationale**: Stale path references in documentation mislead contributors.

**Alternatives considered**: None — this is a straightforward update.
