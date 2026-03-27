# Developer Quickstart: Post-Restructure Layout

## Repository Structure

```
foc-encryption/           ← repo root (workspace shell)
├── packages/
│   ├── foc-encryption/   ← encryption library (publishable)
│   └── foc-demo/         ← CLI demo (private)
├── biome.json            ← workspace-wide lint/format
└── pnpm-workspace.yaml   ← workspace config
```

## Common Workflows

### Install all dependencies (from repo root)

```bash
pnpm install
```

### Build everything (from repo root)

```bash
pnpm -r build
```

### Run all tests (from repo root)

```bash
pnpm -r test
```

### Work on the library only

```bash
cd packages/foc-encryption
pnpm build
pnpm test
```

### Work on the CLI demo only

```bash
cd packages/foc-demo
pnpm build    # also rebuilds foc-encryption if changed (via wireit)
pnpm test
```

### Lint everything (from repo root)

```bash
pnpm exec biome check .
```

## Package Locations

| Package | Path | Purpose |
|---------|------|---------|
| `foc-encryption` | `packages/foc-encryption/` | COSE encryption library (publishable) |
| `foc-demo` | `packages/foc-demo/` | CLI demo tool (private) |

## Notes

- `foc-demo` depends on `foc-encryption` via `workspace:*` — no registry publish needed during development.
- wireit manages incremental builds: rebuilding `foc-demo` automatically rebuilds `foc-encryption` if its sources changed.
- `biome.json` at the root covers both packages; no per-package biome config is needed.
