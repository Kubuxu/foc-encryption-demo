# Data Model: Cache Envelope Parsing for decryptRange

## Modified Entities

### EnvelopeMetadata (extended)

Existing public type in `src/types.ts`. One field added.

| Field | Type | Status | Description |
|-------|------|--------|-------------|
| algorithm | CoseAlgorithmId | existing | `3` or `-65793` |
| seekable | boolean | existing | `true` if chunked scheme |
| iv | Uint8Array | existing | Base nonce (7 bytes for chunked) |
| chunkSize | number? | existing | Plaintext bytes per chunk |
| chunkCount | number? | existing | Total number of chunks |
| appMetadata | AppMetadata? | existing | Custom app-level metadata |
| recipients | RecipientInfo[] | existing | Key descriptor info |
| envelopeSize | number | existing | Byte offset where ciphertext starts |
| **protectedHeaders** | **Uint8Array** | **new** | CBOR-encoded protected headers, needed as AAD for AES-GCM decryption |

### BlobFetcher (unchanged)

| Method | Signature | Description |
|--------|-----------|-------------|
| fetchEnvelope | `() => Promise<Uint8Array>` | Returns envelope bytes; called once by `parseEnvelope` |
| fetchRange | `(offset: number, length: number) => Promise<Uint8Array>` | Returns ciphertext range; called by `decryptRange` |

## Removed Code Paths

- `decryptRange` `Uint8Array` branch (lines 94-97, 123 condition, 155-164 in current `envelope.ts`)
- Internal envelope parsing within `decryptRange` (lines 99-113)
