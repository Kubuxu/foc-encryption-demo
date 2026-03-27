# Feature Specification: Monorepo Packages Restructure

**Feature Branch**: `004-monorepo-packages-restructure`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Currently the library lives in `.` and demo in `demo`, this is not a best pattern. Let's move things into `packages/`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Contributor clones and builds the monorepo (Priority: P1)

A developer clones the repository and wants to build both the encryption library and the CLI demo. With the new structure, all packages live under `packages/`, making it clear where each component resides and how they relate.

**Why this priority**: This is the most fundamental daily workflow. If building breaks, nothing else works.

**Independent Test**: A developer can clone the repo, run the workspace install command, build all packages, and run tests — all from the repository root.

**Acceptance Scenarios**:

1. **Given** a freshly cloned repository, **When** a contributor installs dependencies and builds from the root, **Then** both `packages/foc-encryption` and `packages/foc-demo` build successfully without errors.
2. **Given** the restructured repo, **When** a contributor runs the test suite from the root, **Then** all tests pass with the same results as before the restructure.
3. **Given** the restructured repo, **When** a contributor navigates to `packages/foc-encryption`, **Then** they can build and test that package in isolation.

---

### User Story 2 - Contributor works on the library package in isolation (Priority: P2)

A developer wants to make changes to the encryption library without touching the CLI demo. They navigate into `packages/foc-encryption`, make changes, and run only that package's tests.

**Why this priority**: Package isolation is one of the primary benefits of moving to a `packages/` layout. Without this, the restructure loses its value.

**Independent Test**: Running `npm test` (or equivalent) from within `packages/foc-encryption` builds and tests only the library, with no reference to the demo package.

**Acceptance Scenarios**:

1. **Given** the restructured repo, **When** a contributor runs the build inside `packages/foc-encryption`, **Then** only that package compiles and its output lands in `packages/foc-encryption/dist/`.
2. **Given** the restructured repo, **When** a contributor modifies a source file in `packages/foc-encryption/src/`, **Then** the incremental build picks up only that change.

---

### User Story 3 - Demo package correctly references the library (Priority: P2)

The CLI demo (`packages/foc-demo`) declares a workspace dependency on the encryption library and resolves it correctly. A developer running the demo does not need to publish the library to a registry.

**Why this priority**: The workspace dependency between packages is the core relationship that must be preserved after the restructure.

**Independent Test**: Running the demo CLI from `packages/foc-demo` imports the library from the workspace and executes correctly with no module-not-found errors.

**Acceptance Scenarios**:

1. **Given** both packages exist under `packages/`, **When** the demo is built, **Then** it resolves `foc-encryption` via the workspace link, not an npm registry.
2. **Given** a change to the library, **When** the demo is rebuilt, **Then** it picks up the updated library output.

---

### Edge Cases

- What happens when the root `package.json` no longer owns `src/` and `tests/` directly — any tools that assume root-level source files must be updated.
- How does the workspace handle the case where `packages/foc-encryption` is the publishable package but the root is now a workspace shell — the `name` and `exports` fields must be preserved on the moved package.
- If any build tool or script uses hardcoded relative paths (e.g., `../` references in wireit configs), those paths must be updated to reflect the new depth.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Both the encryption library and the CLI demo MUST be relocated under a `packages/` directory, becoming `packages/foc-encryption/` and `packages/foc-demo/` respectively.
- **FR-002**: The root `package.json` MUST be updated to a workspace-only manifest that no longer acts as the library package itself.
- **FR-003**: The workspace configuration (pnpm-workspace.yaml) MUST be updated so that `packages/*` is the registered workspace glob.
- **FR-004**: The `packages/foc-encryption/package.json` MUST retain the same `name`, `exports`, `files`, and publishable metadata as the original root package.
- **FR-005**: The `packages/foc-demo/package.json` MUST retain its `foc-encryption: workspace:*` dependency, resolving correctly to the sibling package.
- **FR-006**: All build system dependency references (wireit `dependencies` paths) MUST be updated to reflect the new relative positions between packages.
- **FR-007**: The root-level linting, testing, and build commands MUST continue to work across all packages from the repository root.
- **FR-008**: All source code and test files MUST be moved without modification to their logic; only path-related configuration changes are in scope.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All existing tests pass after the restructure with zero test failures — no regressions introduced.
- **SC-002**: Building from the repository root produces the same build artifacts as before, located under `packages/foc-encryption/dist/` and `packages/foc-demo/dist/`.
- **SC-003**: A contributor unfamiliar with the prior layout can identify which package is the publishable library and which is the demo by examining the `packages/` directory alone.
- **SC-004**: No broken workspace references — `foc-demo` resolves `foc-encryption` from the workspace without requiring a registry lookup.
- **SC-005**: The root-level `package.json` has no `src/` or `dist/` entries in `exports` or `files` — it is a pure workspace root.

## Assumptions

- The move is a structural reorganization only; no functionality changes, API changes, or new features are in scope.
- The publishable package name `foc-encryption` and its public API remain identical after the move.
- The root directory will become a workspace shell with no publishable package of its own — the library package lives entirely within `packages/foc-encryption/`.
- Any tooling config files at the root (biome.json, tsconfig.json) will remain at the root and continue to apply workspace-wide, or be replicated per-package as needed.
- Git history for moved files will be preserved using `git mv` or equivalent, maintaining blame and log continuity.
