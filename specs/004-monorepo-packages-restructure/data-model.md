# Data Model: Monorepo Packages Restructure

This feature is a structural reorganization with no runtime data model changes. The relevant "entities" are the workspace configuration artifacts and their relationships.

## Workspace Topology (Before → After)

### Before

```text
<repo-root>/                    # workspace member "." — foc-encryption library (publishable)
  package.json                  # name: foc-encryption, exports: ./dist/index.js
  pnpm-workspace.yaml           # packages: ['.', 'demo']
  src/
  tests/
  tsconfig.json
  vitest.config.ts
  biome.json

demo/                           # workspace member "demo" — foc-demo CLI (private)
  package.json                  # name: foc-demo, dep: foc-encryption: workspace:*
  src/
  tests/
  tsconfig.json
  vitest.config.ts
  README.md
```

### After

```text
<repo-root>/                    # workspace shell (private, no exports)
  package.json                  # private: true, no exports, no files, no publishable deps
  pnpm-workspace.yaml           # packages: ['packages/*']
  biome.json                    # workspace-wide lint/format config (unchanged)

packages/
  foc-encryption/               # workspace member — foc-encryption library (publishable)
    package.json                # name: foc-encryption, exports: ./dist/index.js (unchanged)
    src/                        # moved from <repo-root>/src/
    tests/                      # moved from <repo-root>/tests/
    tsconfig.json               # moved from <repo-root>/tsconfig.json
    vitest.config.ts            # moved from <repo-root>/vitest.config.ts

  foc-demo/                     # workspace member — foc-demo CLI (private)
    package.json                # name: foc-demo, dep: foc-encryption: workspace:*
                                #   wireit dep: ../foc-encryption: build (was ../: build)
    src/                        # moved from demo/src/
    tests/                      # moved from demo/tests/
    tsconfig.json               # moved from demo/tsconfig.json
    vitest.config.ts            # moved from demo/vitest.config.ts
    README.md                   # moved, path references updated
```

## Package Manifest Changes

### Root `package.json` (workspace shell)

Removed fields:
- `name`
- `description`
- `version`
- `exports`
- `files`
- `sideEffects`
- `dependencies` (cborg moves to `packages/foc-encryption`)
- `devDependencies` (typescript, vitest, biome, wireit move to respective packages)
- `wireit` (build/test/lint targets move to respective packages)

Retained fields:
- `packageManager`
- `engines`
- `private: true` (added)
- `pnpm.onlyBuiltDependencies` (retained for workspace-level pnpm config)
- `scripts` (simplified: delegates to `pnpm -r build`, `pnpm -r test`, `pnpm -r lint` or kept empty)

### `packages/foc-encryption/package.json`

All fields from the original root `package.json` are preserved verbatim:
- `name: "foc-encryption"`
- `exports`, `files`, `sideEffects`
- `dependencies`: `cborg`
- `devDependencies`: `@biomejs/biome`, `typescript`, `vitest`, `wireit`
- `wireit`: build/test/lint targets (unchanged, no path references to other packages)

### `packages/foc-demo/package.json`

All fields preserved except one wireit change:
- `wireit.build.dependencies`: `["../: build"]` → `["../foc-encryption: build"]`

## Dependency Graph (unchanged in meaning)

```text
packages/foc-demo
  └── foc-encryption (workspace:*)
        └── cborg
```

The dependency direction and resolution mechanism are unchanged; only the filesystem paths change.
