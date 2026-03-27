# foc-encryption Library Reference

## 1. Public API Exports

From `/src/index.ts`, the library exports:

### Functions
- **`encrypt()`** - Encrypts plaintext into a COSE envelope + ciphertext blob
- **`decrypt()`** - Decrypts a full blob with a content encryption key (CEK)
- **`decryptRange()`** - Decrypts a byte range from seekable encrypted blobs (streaming)
- **`parseEnvelope()`** - Parses envelope metadata (sync or async via BlobFetcher)

### Constants
- **`CoseAlgorithm`** - Algorithm IDs (3 = AES_256_GCM, -65793 = CHUNKED_AES_256_GCM_STREAM)
- **`CoseHeaderParam`** - Custom header labels for chunk size, chunk count, and app metadata
- **`FOC_ENVELOPE_TYPE`** - Content type identifier: `'application/vnd.foc-envelope+cose'`

### Types
- **`CEKBytes`** - 32-byte content encryption key (Uint8Array)
- **`EncryptOptions`** - SimpleEncryptOptions or ChunkedEncryptOptions
- **`ChunkedEncryptOptions`** - Options for seekable encryption (algorithm -65793, optional chunkSize)
- **`SimpleEncryptOptions`** - Non-seekable encryption (algorithm 3)
- **`AppMetadata`** - Application-level metadata (CID, custom fields as bytes/strings/numbers)
- **`EnvelopeMetadata`** - Parsed envelope metadata (algorithm, seekable flag, IV, protected headers, chunk info, recipients, envelope size)
- **`BlobFetcher`** - Interface for range-based fetching without loading entire blob
- **`ByteRange`** - Plaintext coordinate range (offset, length)
- **`Recipient` / `RecipientInfo`** - Multi-recipient key descriptors

### Error Classes
- **`FocEncryptionError`** - Base class
- **`InvalidKeyError`** - CEK validation failures
- **`AuthenticationError`** - AEAD verification failed (wrong key or tampered ciphertext)
- **`MalformedEnvelopeError`** - Invalid COSE envelope
- **`UnsupportedSchemeError`** - Unknown algorithm ID
- **`SchemeNotSeekableError`** - Range decryption on non-seekable scheme

---

## 2. Encryption/Decryption & Envelope Format

### Blob Structure

The encrypted blob is binary-concatenated: `[COSE_Envelope][Ciphertext]`

### COSE_Encrypt0 (Non-seekable, Algorithm 3)
- CBOR tag 16
- Structure: `[protected_headers, unprotected_map, null]`
- Protected headers include algorithm ID and content type
- Unprotected headers include:
  - IV (initialization vector, 12 bytes)
  - APP_METADATA (optional, stored as a Map)
- Uses single 12-byte random IV per encryption
- Ciphertext = plaintext encrypted with AES-256-GCM, includes 16-byte authentication tag

### COSE_Encrypt (Multi-recipient, Algorithm 3 or -65793)
- CBOR tag 96
- Structure: `[protected_headers, unprotected_map, null, recipients_array]`
- Recipients array contains wrapped keys for each recipient
- Each recipient has algorithm, keyId (optional), and wrappedKey

### Chunked-AES-256-GCM-STREAM (Seekable, Algorithm -65793)
- CBOR tag 16 or 96
- Same envelope structure as above
- Additional unprotected headers:
  - CHUNK_SIZE (plaintext chunk size, default 256 KiB)
  - CHUNK_COUNT (total number of chunks)
- Nonce derivation per chunk:
  ```
  nonce[0..6]   = base_nonce[0..6] (7 bytes)
  nonce[7..10]  = chunk_index (4 bytes, big-endian)
  nonce[11]     = last_flag (0x00 or 0x01)
  ```
- Each chunk independently encrypted with AES-256-GCM (plaintext chunk + 16-byte tag)
- Allows decrypting arbitrary ranges without decrypting entire file

### Envelope Metadata (from parseEnvelope)
- `algorithm` - Algorithm ID (3 or -65793)
- `seekable` - Boolean (true for chunked scheme)
- `iv` - Base nonce bytes
- `protectedHeaders` - CBOR-encoded protected map
- `chunkSize` / `chunkCount` - Present only for chunked encryption
- `appMetadata` - Custom application data (Object)
- `recipients` - Array of RecipientInfo
- `envelopeSize` - Byte offset where ciphertext starts

---

## 3. File Fetching & Decryption (Range-based)

### BlobFetcher Interface

```typescript
interface BlobFetcher {
  fetchEnvelope(): Promise<Uint8Array>    // Fetch first ~4KB (envelope only)
  fetchRange(offset: number, length: number): Promise<Uint8Array>
}
```

### Range Decryption Flow (decryptRange)

1. Calculate which encrypted chunks contain the requested byte range
2. Calculate ciphertext offsets accounting for chunk headers + 16-byte tags
3. Fetch only those chunks from the blob
4. Decrypt chunks independently using derived nonces
5. Slice result to exact requested range

### Key Math
- Ciphertext chunk size = `plaintext_chunk_size + 16` (tag length)
- First chunk offset = `envelope_size + first_chunk_index * ciphertext_chunk_size`
- Nonce uses global chunk index (accounting for offset from remote fetch)

### Range Coordinate System
- Offset/length are in **plaintext coordinates** (not ciphertext)
- Enables seeking into large files without downloading entire blob

---

## 4. "Retrieval URL" Concept

This library doesn't directly define "retrieval URLs" but supports them through:

### URL Types (from demo)
- **Direct HTTP/HTTPS URLs** - Can be passed to fetch with Range headers
- **PieceCID references** - Filecoin storage system identifiers that resolve to URLs via Synapse SDK

### URL-based Fetching (from `/demo/src/synapse.ts`)

```typescript
function createBlobFetcher(url: string): BlobFetcher {
  return {
    async fetchEnvelope() {
      const resp = await fetch(url, { headers: { Range: 'bytes=0-4095' } })
      return new Uint8Array(await resp.arrayBuffer())
    },
    async fetchRange(offset: number, length: number) {
      const resp = await fetch(url, {
        headers: { Range: `bytes=${offset}-${offset + length - 1}` },
      })
      return new Uint8Array(await resp.arrayBuffer())
    },
  }
}
```

The "retrieval URL" is the HTTP endpoint serving the encrypted blob, supporting HTTP Range requests for efficient partial downloads.

---

## 5. CLI Demo (003) Usage Patterns

### Commands

#### encrypt
```
foc-demo encrypt <file> --key <hex-key> --output <path>
foc-demo encrypt <file> --password <password> --output <path>
```
- Auto-selects algorithm based on file size (>256 KiB → chunked)
- Derives CEK from password using PBKDF2 (600K iterations, SHA-256)
- Stores PBKDF2 parameters in appMetadata for decryption

#### decrypt
```
foc-demo decrypt <file> --key <hex-key> --output <path>
foc-demo decrypt <file> --password <password> --output <path>
```
- Loads encrypted blob locally
- Parses envelope to extract PBKDF2 parameters if password used
- Derives CEK and decrypts

#### upload
```
foc-demo upload <file> --key <hex-key> --privateKey <private-key>
foc-demo upload <file> --password <password> --privateKey <private-key>
```
- Encrypts file
- Uploads to Filecoin via Synapse SDK
- Returns PieceCID for retrieval

#### download
```
foc-demo download <locator> --key <hex-key> --output <path>
foc-demo download https://url/blob.enc --key <hex-key> --output <path>
foc-demo download <piececid> --password <password> --privateKey <key> --output <path>
```
- Accepts URL or PieceCID locator
- Fetches full blob and decrypts
- Outputs plaintext to file

#### range
```
foc-demo range <locator> --offset <bytes> --length <bytes> --key <hex-key> [--output <path>]
```
- Accepts seekable encrypted blob (HTTP URL or PieceCID)
- Decrypts only requested byte range
- Outputs to file or stdout
- Only works with CHUNKED_AES_256_GCM_STREAM (fails gracefully on non-seekable)

### Key Sources
- `--key` expects 64 hex characters (256-bit key)
- `--password` uses PBKDF2 with 16-byte random salt (stored in envelope)
- Either password or key required, not both

---

## 6. Usage Example (from tests)

```typescript
import { encrypt, decrypt, parseEnvelope, decryptRange, CoseAlgorithm } from 'foc-encryption'

// Encryption
const cek = crypto.getRandomValues(new Uint8Array(32))
const plaintext = new TextEncoder().encode('Hello, World!')

// Non-seekable
const blob = await encrypt(plaintext, cek, {
  algorithm: CoseAlgorithm.AES_256_GCM
})

// Seekable (chunked)
const chunkedBlob = await encrypt(plaintext, cek, {
  algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
  chunkSize: 64 * 1024
})

// Full decryption
const decrypted = await decrypt(blob, cek)

// Range decryption (seekable only)
const meta = parseEnvelope(chunkedBlob)
const fetcher = createBlobFetcher('https://example.com/file.enc')
const range = await decryptRange(fetcher, meta, cek, { offset: 100, length: 50 })

// Multi-recipient
const recipients = [
  { algorithm: -3, keyId: Buffer.from('alice'), wrappedKey: Buffer.from([...]) },
  { algorithm: -3, keyId: Buffer.from('bob'), wrappedKey: Buffer.from([...]) }
]
const multiBlob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)
```

---

## Key Design Insights

1. **Separation of Concerns**: Encryption algorithm (AES-256-GCM) is separate from envelope format (COSE) and seekability (chunking)
2. **Safe Key Handling**: CEK is zeroed after use via `importAndZeroCek()`
3. **Standards-Based**: Uses CBOR/COSE (RFC 9052) for interoperability
4. **Keyless Inspection**: Envelope can be parsed without decryption key
5. **Efficient Streaming**: Chunked mode enables HTTP Range requests for partial downloads
6. **Extensible Metadata**: App-level metadata stored in envelope for custom data (CIDs, parameters, etc.)

---

## Source Files Reference

- Main API: `/src/index.ts`, `/src/envelope.ts`
- Types: `/src/types.ts`
- Encryption schemes: `/src/schemes/aes-256-gcm.ts`, `/src/schemes/chunked-aes-256-gcm.ts`
- COSE encoding/decoding: `/src/cose/encode.ts`, `/src/cose/decode.ts`
- CLI demo: `/demo/src/cli.ts`, `/demo/src/commands/`
- Tests with examples: `/tests/integration/encrypt-decrypt.test.ts`, `/tests/integration/seekable.test.ts`
