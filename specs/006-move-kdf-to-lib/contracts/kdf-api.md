# Contract: foc-encryption KDF Public API

## Added Exports (foc-encryption main entry point)

### `deriveKey`

```typescript
async function deriveKey(source: KeySource, existingSalt?: Uint8Array): Promise<DerivedKey>
```

**Behavior**:
- If `source.kind === 'hex'`: validates the hex string and returns `{ cek: <32 bytes> }` with no salt.
- If `source.kind === 'password'`: derives a 32-byte CEK via PBKDF2-SHA256 with 600,000 iterations. If `existingSalt` is provided, uses it (deterministic); otherwise generates a random 16-byte salt.

**Throws**:
- On invalid hex (wrong length or non-hex characters): descriptive `Error`.

**Algorithm contract** (interoperability guarantee):
- Algorithm: PBKDF2
- Hash: SHA-256
- Iterations: 600,000
- Salt length: 16 bytes
- Output length: 256 bits (32 bytes)

---

### `KeySource` (type)

```typescript
type KeySource =
  | { kind: 'hex'; hex: string }
  | { kind: 'password'; password: string }
```

---

### `DerivedKey` (interface)

```typescript
interface DerivedKey {
  cek: Uint8Array   // Always 32 bytes
  salt?: Uint8Array  // Present and 16 bytes when derived from a password
}
```

---

## Unchanged Exports

All previously exported symbols from `foc-encryption` remain unchanged. This is a purely additive change.

## Not Exported

`hexToBytes` is NOT part of the public API. It is an internal implementation detail of `kdf.ts`.
