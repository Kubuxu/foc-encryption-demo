# Data Model: CLI Demo

## Core Types

### KeySource

Represents how the user provides encryption key material.

```typescript
type KeySource =
  | { kind: 'hex'; hex: string }          // Raw 256-bit key as hex string (64 chars)
  | { kind: 'password'; password: string } // Password for PBKDF2 derivation
```

### DerivedKey

Result of resolving a `KeySource` to a usable CEK.

```typescript
interface DerivedKey {
  cek: Uint8Array       // 32-byte content encryption key
  salt?: Uint8Array     // 16-byte PBKDF2 salt (only for password-derived keys)
}
```

### PieceLocator

Identifies an encrypted blob on the network — either by PieceCID (requires wallet to resolve) or by direct HTTP retrieval URL (shareable, no wallet needed).

```typescript
type PieceLocator =
  | { kind: 'pieceCid'; pieceCid: string }   // Requires wallet to resolve retrieval URL
  | { kind: 'url'; url: string }              // Direct HTTP URL (shareable)
```

**Detection**: If the string starts with `http://` or `https://`, parse as URL. Otherwise treat as PieceCID.

### UploadResult

Returned after encrypt + upload.

```typescript
interface UploadResult {
  pieceCid: string         // PieceCID of the uploaded encrypted blob
  algorithm: string        // "AES-256-GCM" or "Chunked-AES-256-GCM-STREAM"
  plaintextSize: number    // Original file size in bytes
  blobSize: number         // Encrypted blob size in bytes
  chunkCount?: number      // Number of chunks (seekable mode only)
  retrievalUrl?: string    // URL for direct retrieval (if available)
}
```

### DownloadResult

Returned after download + decrypt.

```typescript
interface DownloadResult {
  plaintext: Uint8Array    // Decrypted file contents
  algorithm: string        // Algorithm used for encryption
  plaintextSize: number    // Size of decrypted data
}
```

### SynapseConfig

Configuration for synapse-sdk client.

```typescript
interface SynapseConfig {
  privateKey: string       // Hex-encoded wallet private key (from --private-key flag or FOC_PRIVATE_KEY env)
  source: string           // App identifier (always "foc-demo-cli")
}
```

## State Transitions

### Encrypt + Upload Flow

```
LocalFile → read → Uint8Array (plaintext)
  → resolveKey(KeySource) → DerivedKey { cek, salt? }
  → encrypt(plaintext, cek, options) → Uint8Array (blob)
  → synapse.storage.upload(blob) → UploadResult
```

### Download + Decrypt Flow

```
PieceLocator → resolveUrl(locator) → HTTP retrieval URL
  (PieceCID path: synapse.storage → resolve provider URL, requires wallet)
  (URL path: use directly, no wallet needed)
  → fetch(url) → Uint8Array (blob)
  → parseEnvelope(blob) → EnvelopeMetadata { appMetadata with salt }
  → resolveKey(KeySource, salt?) → DerivedKey { cek }
  → decrypt(blob, cek) → Uint8Array (plaintext)
  → write to output file
```

### Range Decrypt Flow

```
PieceLocator → resolveUrl(locator) → HTTP retrieval URL
  → createBlobFetcher(url) → BlobFetcher
  → parseEnvelope(fetcher) → EnvelopeMetadata { appMetadata with salt }
  → resolveKey(KeySource, salt?) → DerivedKey { cek }
  → decryptRange(fetcher, metadata, cek, range) → Uint8Array (partial plaintext)
  → write to output file
```

## Validation Rules

| Field | Rule |
|-------|------|
| hex key | Must be exactly 64 hex characters (256 bits) |
| password | Must be non-empty |
| PBKDF2 salt | Exactly 16 bytes |
| locator | Must be a valid HTTP(S) URL or a valid CID string |
| PieceCID | Must be a valid CID string (validated by synapse-sdk); wallet required |
| output path | Parent directory must exist |
| range offset | Non-negative integer |
| range length | Positive integer |
| private key | Must be valid Ethereum private key (validated by viem) |

## AppMetadata Extension

When encrypting with a password-derived key, the COSE envelope's `appMetadata` includes:

```typescript
{
  pbkdf2_salt: Uint8Array,     // 16-byte salt
  pbkdf2_iterations: 600000,   // iteration count
  pbkdf2_hash: 'SHA-256',      // hash algorithm
  source_name?: string,        // original filename (optional)
  source_size?: number,        // original file size (optional)
}
```

This allows the decryption side to reconstruct the key from the password without out-of-band salt communication.
