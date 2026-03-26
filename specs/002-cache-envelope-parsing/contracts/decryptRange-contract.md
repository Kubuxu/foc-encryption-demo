# Contract: decryptRange and parseEnvelope

## parseEnvelope (modified)

**Before**:
```
parseEnvelope(blob: Uint8Array): EnvelopeMetadata
```

**After**:
```
parseEnvelope(blob: Uint8Array | BlobFetcher): EnvelopeMetadata | Promise<EnvelopeMetadata>
```

- When given `Uint8Array`: synchronous, returns `EnvelopeMetadata` directly
- When given `BlobFetcher`: async, calls `fetchEnvelope()`, returns `Promise<EnvelopeMetadata>`
- `EnvelopeMetadata` now includes `protectedHeaders: Uint8Array`

**Errors**:
- `MalformedEnvelopeError`: envelope bytes are not valid CBOR or COSE structure

## decryptRange (modified)

**Before**:
```
decryptRange(blob: Uint8Array | BlobFetcher, cek: CEKBytes, range: ByteRange): Promise<Uint8Array>
```

**After**:
```
decryptRange(fetcher: BlobFetcher, metadata: EnvelopeMetadata, cek: CEKBytes, range: ByteRange): Promise<Uint8Array>
```

- `fetcher`: BlobFetcher for ciphertext chunk access (only `fetchRange` is called)
- `metadata`: Pre-parsed envelope metadata from `parseEnvelope`
- `cek`: 32-byte content encryption key (zeroed after import)
- `range`: `{ offset: number, length: number }` in plaintext byte space
- Returns: Decrypted plaintext bytes for the requested range

**Errors**:
- `SchemeNotSeekableError`: if `metadata.algorithm` is not the chunked scheme
- `InvalidKeyError`: if CEK is wrong length
- `AuthenticationError`: if decryption fails (wrong key, corrupted data, mismatched metadata/fetcher)

## Removed

- `decryptRange` no longer accepts `Uint8Array` as first argument
- `decryptRange` no longer fetches or parses the envelope internally
