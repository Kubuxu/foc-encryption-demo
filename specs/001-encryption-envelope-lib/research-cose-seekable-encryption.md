# Research: COSE and Seekable Encryption

**Date**: 2026-03-26
**Question**: Does COSE define any seekable encryption formats?

## Answer

**No.** COSE defines no seekable, chunked, or streaming encryption format in any published RFC or active IETF draft.

## What COSE Provides

COSE (RFC 9052) defines two encryption structures:

- **COSE_Encrypt** -- multi-recipient, with per-recipient key management descriptors
- **COSE_Encrypt0** -- single-recipient, simplified

Both treat payloads as **atomic units**: the entire plaintext is encrypted in a single AEAD operation producing a single ciphertext with a single authentication tag. There is no concept of chunks, segments, or byte-range addressing.

### Registered Content Encryption Algorithms (RFC 9053)

All are single-operation AEAD:

| Algorithm             | COSE ID | Key Size |
|----------------------|---------|----------|
| A128GCM              | 1       | 128-bit  |
| A192GCM              | 2       | 192-bit  |
| A256GCM              | 3       | 256-bit  |
| AES-CCM (various)    | 10-13, 30-33 | 128/256-bit |
| ChaCha20/Poly1305    | 24      | 256-bit  |

### Non-AEAD Algorithms (RFC 9459)

| Algorithm | COSE ID | Status     |
|-----------|---------|------------|
| A128CTR   | -65534  | Deprecated |
| A192CTR   | -65533  | Deprecated |
| A256CTR   | -65532  | Deprecated |
| A128CBC   | -65531  | Deprecated |
| A192CBC   | -65530  | Deprecated |
| A256CBC   | -65529  | Deprecated |

**AES-CTR** is the only registered algorithm whose underlying cipher supports random access at the block level (counter blocks are independently computable). However, it is non-AEAD, marked **Deprecated**, and provides no integrity protection. It was added specifically for SUIT firmware encryption where integrity is provided externally via manifest digests.

## No Active Drafts for Chunked/Seekable Encryption

The COSE working group has no drafts addressing chunked or seekable encryption. Current work focuses on post-quantum signatures (SLH-DSA, FN-DSA), key representations, HPKE integration, and certificate encoding.

## Related Work Outside COSE

### IETF (non-COSE)

- **draft-ietf-suit-firmware-encryption** (SUIT WG) -- Sector-based encryption of firmware images using AES-CTR within COSE envelopes. Firmware is chunked into sectors (typically 4 KiB, flash-aligned). Provides random access but relies on AES-CTR with **no per-chunk authentication**; integrity is provided externally by the SUIT manifest digest. Not a general-purpose seekable encryption scheme.

- **draft-ietf-ohai-chunked-ohttp** (OHAI WG) -- Chunked encryption for Oblivious HTTP using HPKE. This is **streaming** (not seekable/random-access) and protocol-specific.

### Industry

| Scheme | Construction | Chunk Size | Random Access? |
|--------|-------------|------------|----------------|
| **Google Tink Streaming AEAD** | Per-segment AES-GCM; nonce = `NoncePrefix \|\| segment_index \|\| last_flag` | Configurable (4 KiB -- 1 MiB) | Yes |
| **age** (C2SP spec) | STREAM construction; ChaCha20-Poly1305 | 64 KiB | Yes (chunk-aligned) |
| **Miscreant/STREAM** (Hoang, Reyhanitabar, Rogaway 2015) | Theoretical foundation: chunk counter + last-chunk indicator in AEAD nonce | N/A | Yes |

### Key Design Pattern: The STREAM Construction

The STREAM construction (Hoang et al., 2015) is the theoretical foundation used by both Tink and age. The core idea:

1. Divide plaintext into fixed-size chunks
2. Derive each chunk's nonce as: `base_nonce XOR (chunk_index || last_chunk_flag)`
3. Encrypt each chunk independently with AEAD (e.g., AES-GCM)
4. The `last_chunk_flag` prevents truncation attacks
5. The `chunk_index` prevents reordering attacks
6. Each chunk is independently decryptable given the key and its index

This enables O(chunk_size) random access: to decrypt byte range [a, b), compute which chunks overlap that range and decrypt only those chunks.

## Implications for This Project

Since no standard COSE algorithm exists for seekable encryption, the project must define a custom chunked-AEAD scheme as an application-layer extension. For the COSE algorithm identifier:

1. **During development**: Use a private-use algorithm identifier (values < -65536 in the IANA COSE Algorithms registry)
2. **For standardisation**: Register a new identifier via IANA (requires Expert Review per RFC 9053)

Scheme-specific parameters (chunk size, chunk count, etc.) should be conveyed in COSE header parameters, which are similarly extensible via the IANA COSE Header Parameters registry.

## Sources

- [RFC 9052 -- COSE: Structures and Process](https://datatracker.ietf.org/doc/rfc9052/)
- [RFC 9053 -- COSE: Initial Algorithms](https://datatracker.ietf.org/doc/rfc9053/)
- [RFC 9459 -- COSE: AES-CTR and AES-CBC](https://datatracker.ietf.org/doc/rfc9459/)
- [IANA COSE Algorithms Registry](https://www.iana.org/assignments/cose/cose.xhtml)
- [draft-ietf-suit-firmware-encryption](https://datatracker.ietf.org/doc/draft-ietf-suit-firmware-encryption/)
- [Tink Streaming AEAD](https://developers.google.com/tink/streaming-aead/aes_gcm_hkdf_streaming)
- [age encryption spec (C2SP)](https://github.com/C2SP/C2SP/blob/main/age.md)
- [Online Authenticated-Encryption and its Nonce-Reuse Misuse-Resistance (Hoang et al., 2015)](https://eprint.iacr.org/2015/189.pdf)
