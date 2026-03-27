# Contract: foc-encryption Package Exports

This contract is **unchanged** by the restructure. It is documented here as a baseline to verify nothing is broken after the move.

## npm Package Identity

```
name:    foc-encryption
version: 0.1.0 (unchanged)
```

## Export Map

```json
{
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js"
  }
}
```

- **Entry point**: `foc-encryption` (bare import)
- **Module format**: ESM only (`"type": "module"`)
- **Types**: TypeScript declaration files included

## Published Files

```
dist/   (compiled output)
src/    (source included for reference)
```

## Invariant

After the restructure, importing `foc-encryption` in any consumer (including `foc-demo`) MUST resolve to `packages/foc-encryption/dist/index.js` via the workspace link. The public API surface (all exports from `src/index.ts`) MUST be byte-for-byte identical to the pre-restructure build output.
