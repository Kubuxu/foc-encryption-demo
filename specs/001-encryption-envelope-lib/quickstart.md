# Quickstart: foc-encryption

## Install

```bash
pnpm add foc-encryption
```

## Basic Encryption & Decryption (AES-256-GCM)

```typescript
import { encrypt, decrypt, CoseAlgorithm } from 'foc-encryption'

// Generate a 256-bit content encryption key
const cek = crypto.getRandomValues(new Uint8Array(32))

// Encrypt
const plaintext = new TextEncoder().encode('Hello, Filecoin!')
const blob = await encrypt(plaintext, cek, {
  algorithm: CoseAlgorithm.AES_256_GCM,
})

// Decrypt
const decrypted = await decrypt(blob, cek)
console.log(new TextDecoder().decode(decrypted))
// → "Hello, Filecoin!"
```

## Seekable Encryption (Large Files)

```typescript
import { encrypt, decryptRange, CoseAlgorithm } from 'foc-encryption'

const largeFile = new Uint8Array(10 * 1024 * 1024) // 10 MB
const cek = crypto.getRandomValues(new Uint8Array(32))

// Encrypt with chunked scheme (256 KiB chunks by default)
const blob = await encrypt(largeFile, cek, {
  algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
})

// Decrypt only bytes 1000–1999 (reads only the affected chunks)
const range = await decryptRange(blob, cek, { offset: 1000, length: 1000 })
```

## Inspect Envelope Without a Key

```typescript
import { parseEnvelope, CoseAlgorithm } from 'foc-encryption'

const metadata = parseEnvelope(blob)
console.log(metadata.algorithm)    // 3 or -65793
console.log(metadata.seekable)    // true/false
console.log(metadata.recipients)  // key management descriptors
console.log(metadata.appMetadata) // { cid: Uint8Array, ... } or undefined
```

## Multi-Recipient Encryption

```typescript
import { encrypt, CoseAlgorithm } from 'foc-encryption'

const cek = crypto.getRandomValues(new Uint8Array(32))
const plaintext = new TextEncoder().encode('Shared secret')

// Wrap the CEK for each recipient (using your key management layer)
const recipients = [
  {
    algorithm: -3, // A256KW
    keyId: new TextEncoder().encode('alice'),
    wrappedKey: wrapKeyForAlice(cek),
  },
  {
    algorithm: -3,
    keyId: new TextEncoder().encode('bob'),
    wrappedKey: wrapKeyForBob(cek),
  },
]

const blob = await encrypt(plaintext, cek, {
  algorithm: CoseAlgorithm.AES_256_GCM,
}, recipients)
```

## Range Decryption with HTTP Fetcher

```typescript
import { decryptRange, CoseAlgorithm } from 'foc-encryption'

// Implement BlobFetcher for HTTP Range requests
const fetcher = {
  async fetchEnvelope() {
    // Fetch first ~1KB to get the envelope
    const res = await fetch(url, { headers: { Range: 'bytes=0-1023' } })
    return new Uint8Array(await res.arrayBuffer())
  },
  async fetchRange(offset: number, length: number) {
    const res = await fetch(url, {
      headers: { Range: `bytes=${offset}-${offset + length - 1}` },
    })
    return new Uint8Array(await res.arrayBuffer())
  },
}

const cek = /* obtain key from your KMS */
const partial = await decryptRange(fetcher, cek, { offset: 0, length: 4096 })
```

## Error Handling

```typescript
import {
  decrypt,
  InvalidKeyError,
  AuthenticationError,
  UnsupportedSchemeError,
  MalformedEnvelopeError,
} from 'foc-encryption'

try {
  const plaintext = await decrypt(blob, cek)
} catch (err) {
  if (err instanceof InvalidKeyError) {
    console.error('Key is wrong size or invalid')
  } else if (err instanceof AuthenticationError) {
    console.error('Data has been tampered with, or wrong key')
  } else if (err instanceof UnsupportedSchemeError) {
    console.error(`Unknown algorithm: ${err.algorithmId}`)
  } else if (err instanceof MalformedEnvelopeError) {
    console.error('Blob does not contain a valid COSE envelope')
  }
}
```
