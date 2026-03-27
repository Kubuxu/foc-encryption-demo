# Research: Move KDF to foc-encryption Library

## Decision 1: New file vs. extend key-utils.ts

**Decision**: Create a new `packages/foc-encryption/src/kdf.ts` module.

**Rationale**: `key-utils.ts` already handles key *validation and import* (`validateCek`, `importAndZeroCek`, `zeroBuffer`). Key *derivation* is a distinct concern: it takes user-supplied material (password or hex) and produces a raw CEK. Mixing these would widen `key-utils.ts` beyond its current responsibility. A dedicated `kdf.ts` keeps single-responsibility clean and mirrors the naming convention in the demo.

**Alternatives considered**: Appending to `key-utils.ts` — rejected because it conflates two distinct operations (validation vs. derivation) and makes the module harder to read.

---

## Decision 2: hexToBytes visibility

**Decision**: `hexToBytes` remains unexported from `index.ts`. It lives in `kdf.ts` without an `export` statement visible to external consumers, but is importable by intra-package tests via its module path (`../../src/kdf.js`).

**Rationale**: Confirmed in clarification session. The function is a narrow implementation detail of the hex key path in `deriveKey`. Exposing it would enlarge the public API surface without adding meaningful value to library consumers, who interact with `deriveKey` directly.

**Alternatives considered**: Exporting from `index.ts` — rejected (see clarification Q2).

---

## Decision 3: Test migration strategy

**Decision**: The `hexToBytes` and `deriveKey` test suites move to `packages/foc-encryption/tests/unit/kdf.test.ts`. The `parseKeySource` suite stays in `foc-demo`. A new smoke test is added to `foc-demo` that imports `deriveKey` from `foc-encryption` and calls it with a known password + salt to confirm wiring.

**Rationale**: Confirmed in clarification session (Option A). Unit tests belong next to the code under test. `parseKeySource` is CLI-specific and stays with its module.

**Alternatives considered**: Keeping all tests in `foc-demo` — rejected because it leaves the library undertested as a standalone unit.

---

## Decision 4: parseKeySource placement

**Decision**: `parseKeySource` stays in `packages/foc-demo/src/key.ts` unchanged. It references the `KeySource` type, which will now be imported from `foc-encryption`.

**Rationale**: `parseKeySource` is CLI-specific (reads `flags.key` / `flags.password`). Its only connection to the library is via the `KeySource` type, which it creates and returns. The import path update is the only change needed.

---

## No unknowns remain. All NEEDS CLARIFICATION items resolved.
