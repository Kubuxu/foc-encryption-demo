# Data Model: Encryption Envelope Library

**Feature**: 001-encryption-envelope-lib
**Date**: 2026-03-26

## Entities

### EncryptedBlob

The canonical output format: COSE envelope concatenated with ciphertext.

```
[COSE envelope (CBOR, self-delimiting)] [ciphertext bytes]
```

| Field | Type | Description |
|-------|------|-------------|
| envelope | `Uint8Array` | CBOR-encoded COSE_Encrypt or COSE_Encrypt0 structure |
| ciphertext | `Uint8Array` | Encrypted data (simple AEAD output or concatenated chunk ciphertexts) |

**Validation**: Envelope must be valid CBOR. Blob must be at least envelope-size bytes.
**Parsing**: `cborg.decodeFirst()` on the blob yields the envelope; remainder is ciphertext.

### CoseEnvelope

A COSE_Encrypt or COSE_Encrypt0 structure in detached-payload mode.

**COSE_Encrypt0** (CBOR Tag 16 — single recipient):
```
[protected: bstr, unprotected: map, ciphertext: nil]
```

**COSE_Encrypt** (CBOR Tag 96 — multiple recipients):
```
[protected: bstr, unprotected: map, ciphertext: nil, recipients: [+CoseRecipient]]
```

#### Protected Headers (authenticated, CBOR-encoded map inside bstr)

| Label | Name | Type | Required | Description |
|-------|------|------|----------|-------------|
| 1 | `alg` | int | YES | COSE algorithm identifier. `3` = AES-256-GCM, `-65537` = Chunked-AES-256-GCM-STREAM |
| 16 | `typ` | tstr | YES | Envelope type identifier: `"application/vnd.foc-envelope+cose"` |

#### Unprotected Headers

| Label | Name | Type | Required | Description |
|-------|------|------|----------|-------------|
| 5 | `iv` | bstr | YES | Initialization vector. 12 bytes for AES-256-GCM simple scheme. 7-byte base nonce for chunked scheme. |
| -65790 | `chunk_size` | uint | Chunked only | Chunk size in bytes (default 262144 = 256 KiB) |
| -65791 | `chunk_count` | uint | Chunked only | Total number of chunks |
| -65792 | `app_metadata` | map | NO | Application metadata (CBOR map with string keys, see below) |

**Note**: `iv` is in unprotected headers because it does not need authentication — it is bound into the AEAD computation via the nonce. The `alg` and `typ` are in protected headers because they determine processing semantics and must be authenticated.

#### Application Metadata Map (`-65792`)

A CBOR map with string keys containing application-level metadata. This is not a COSE header map — keys are strings for readability.

| Key | Type | Required | Description |
|-----|------|----------|-------------|
| `"cid"` | bstr | NO | Original plaintext content identifier (CID) per FR-019 |

### CoseRecipient

A COSE_recipient structure describing how one party obtains the CEK.

```
[protected: bstr, unprotected: map, ciphertext: bstr]
```

| Header Label | Name | Type | Description |
|--------------|------|------|-------------|
| 1 | `alg` | int | Key management algorithm (e.g., -3 = A256KW, -6 = direct) |
| 4 | `kid` | bstr | Key identifier for the recipient |
| — | — | — | Additional algorithm-specific parameters |

The `ciphertext` field contains the wrapped CEK (or is empty for direct key agreement).

### ContentEncryptionKey (CEK)

| Field | Type | Constraints |
|-------|------|-------------|
| key_bytes | `Uint8Array` | Exactly 32 bytes for AES-256 |

**Validation**: Must be exactly 32 bytes. Must not be all zeros.
**Lifecycle**: Imported via `crypto.subtle.importKey()` with `extractable: false`. Zeroed from source buffer after import.

### EncryptionScheme

| Field | Type | Description |
|-------|------|-------------|
| algorithm_id | `number` | COSE algorithm identifier |
| name | `string` | Human-readable name |
| is_seekable | `boolean` | Whether scheme supports range decryption |

**Registered schemes**:

| Algorithm ID | Name | Seekable | IV Size | Notes |
|-------------|------|----------|---------|-------|
| 3 | AES-256-GCM | No | 12 bytes | IANA standard, baseline interop |
| -65793 | Chunked-AES-256-GCM-STREAM | Yes | 7 bytes (base nonce) | Private-use, STREAM construction |

### ChunkMetadata (seekable scheme only)

| Field | Type | Description |
|-------|------|-------------|
| chunk_size | `number` | Bytes per chunk (default 262144) |
| chunk_count | `number` | Total number of chunks |
| base_nonce | `Uint8Array` | 7-byte random nonce prefix |

**Nonce derivation per chunk**:
```
nonce_i[0..6]  = base_nonce[0..6]
nonce_i[7..10] = chunk_index (4 bytes, big-endian)
nonce_i[11]    = last_flag (0x00 or 0x01)
```

**Chunk ciphertext layout**:
```
[chunk_0_ciphertext || tag_0] [chunk_1_ciphertext || tag_1] ... [chunk_n_ciphertext || tag_n]
```
Each chunk ciphertext is `chunk_size + 16` bytes (16-byte auth tag), except the last chunk which may be smaller.

## State Transitions

### Encryption Flow

```
Plaintext + CEK + SchemeConfig
    → validate inputs
    → generate random IV/nonce
    → encrypt (simple or chunked)
    → build COSE envelope (protected + unprotected headers)
    → assemble blob (envelope || ciphertext)
    → zero key material
    → return EncryptedBlob
```

### Decryption Flow

```
EncryptedBlob + CEK
    → parse envelope (decodeFirst)
    → extract algorithm, IV, scheme params
    → validate scheme is supported
    → decrypt (simple or chunked, optionally with byte range)
    → verify authentication tags
    → zero key material
    → return plaintext
```

### Range Decryption Flow (seekable only)

```
EncryptedBlob + CEK + ByteRange(offset, length)
    → parse envelope
    → verify scheme is seekable (error if not)
    → compute affected chunk range from byte offset/length
    → decrypt only affected chunks
    → slice to exact requested byte range
    → return partial plaintext
```

## Relationships

```
EncryptedBlob
  └── CoseEnvelope (1:1)
        ├── EncryptionScheme (1:1, via alg header)
        ├── ChunkMetadata (0:1, present only for seekable scheme)
        └── CoseRecipient (0:N, via recipients array in COSE_Encrypt)
              └── wrapped CEK or key reference
```
