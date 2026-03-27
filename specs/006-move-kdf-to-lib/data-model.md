# Data Model: Move KDF to foc-encryption Library

## Types Moving to foc-encryption

### KeySource (union type)

Represents the input material from which a CEK can be derived.

| Variant | Field | Type | Constraint |
|---------|-------|------|------------|
| `{ kind: 'hex' }` | `hex` | `string` | Exactly 64 hex characters (0-9, a-f, A-F) |
| `{ kind: 'password' }` | `password` | `string` | Non-empty UTF-8 string |

### DerivedKey (interface)

The output of `deriveKey`. Contains the raw 32-byte CEK and, for password-derived keys, the salt used.

| Field | Type | Present when |
|-------|------|-------------|
| `cek` | `Uint8Array` | Always — 32 bytes |
| `salt` | `Uint8Array \| undefined` | Only for `kind: 'password'` — 16 bytes |

### hexToBytes (internal function)

Not part of the public data model. Internal to `kdf.ts`. Converts a 64-char hex string to a 32-byte `Uint8Array`. Throws on invalid input.

---

## New Module: packages/foc-encryption/src/kdf.ts

Contains all KDF logic. Has no runtime dependencies on other `foc-encryption` modules.

```
kdf.ts
  ├── (internal) hexToBytes(hex: string): Uint8Array
  ├── export type KeySource
  ├── export interface DerivedKey
  └── export async deriveKey(source: KeySource, existingSalt?: Uint8Array): Promise<DerivedKey>
```

---

## Updated Entry Point: packages/foc-encryption/src/index.ts

Adds three new exports (two types, one function):

```
+ export type { KeySource, DerivedKey } from './kdf.js'
+ export { deriveKey } from './kdf.js'
```

---

## Updated Demo: packages/foc-demo/src/key.ts

- Removes local definitions of `KeySource`, `DerivedKey`, `hexToBytes`, `deriveKey`
- Imports `KeySource`, `DerivedKey`, `deriveKey` from `foc-encryption`
- `hexToBytes` import from the library's internal module path (for demo use if needed) OR removed from demo entirely since `parseKeySource` doesn't call it directly

---

## No new persistent state, storage, or external data entities are introduced.
