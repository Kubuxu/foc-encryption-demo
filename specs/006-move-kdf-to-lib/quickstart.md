# Quickstart: Using the KDF from foc-encryption

After this feature lands, any consumer of the `foc-encryption` library can derive a CEK directly:

```typescript
import { deriveKey } from 'foc-encryption'

// Password-based: generates a random salt
const { cek, salt } = await deriveKey({ kind: 'password', password: 'my-secret' })

// Password-based: deterministic, using a stored salt
const { cek } = await deriveKey({ kind: 'password', password: 'my-secret' }, storedSalt)

// Raw hex key (no KDF, direct decode)
const { cek } = await deriveKey({ kind: 'hex', hex: 'ab'.repeat(32) })
```

The returned `cek` can be passed directly to `encrypt()` or `decrypt()` from the same package.

## Migration for foc-demo consumers

`foc-demo` continues to work unchanged from the user's perspective. The `--password` and `--key` CLI flags behave identically; internally the demo now delegates to the library.
