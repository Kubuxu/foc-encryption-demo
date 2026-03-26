# Quickstart: Cache Envelope Parsing for decryptRange

## Usage (after this change)

```typescript
import { parseEnvelope, decryptRange } from 'foc-encryption'
import type { BlobFetcher, ByteRange } from 'foc-encryption'

// 1. Create a BlobFetcher for your storage backend
const fetcher: BlobFetcher = {
  async fetchEnvelope() { /* return envelope bytes */ },
  async fetchRange(offset, length) { /* return ciphertext bytes */ },
}

// 2. Parse envelope once (async when using BlobFetcher)
const metadata = await parseEnvelope(fetcher)

// 3. Decrypt multiple ranges reusing the same metadata
const cek = /* your 32-byte content encryption key */
const chunk1 = await decryptRange(fetcher, metadata, cek, { offset: 0, length: 1024 })
const chunk2 = await decryptRange(fetcher, metadata, cek, { offset: 8192, length: 4096 })
const chunk3 = await decryptRange(fetcher, metadata, cek, { offset: 100000, length: 512 })
// Only one fetchEnvelope() call occurred (in step 2)
```

## Migration from previous API

```typescript
// BEFORE (each call fetches + parses envelope):
const data = await decryptRange(fetcher, cek, range)

// AFTER (parse once, pass metadata):
const metadata = await parseEnvelope(fetcher)
const data = await decryptRange(fetcher, metadata, cek, range)

// BEFORE (Uint8Array path — removed):
const data = await decryptRange(blob, cek, range)

// AFTER (use decrypt for full blobs):
const data = await decrypt(blob, cek)
// then slice the plaintext yourself
```
