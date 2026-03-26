# Feature Specification: Encryption Envelope Library for FOC

**Feature Branch**: `001-encryption-envelope-lib`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Build a library for encrypting content addressed data in Filecoin on-chain cloud ecosystem. COSE-based encryption envelope format for decentralised access controls, based on knowledge of the key. This is the lowest layer of the access control stack."

## Clarifications

### Session 2026-03-26

- Q: How are the COSE envelope and ciphertext packaged together? → A: Detached. The envelope and ciphertext are concatenated into a single blob (envelope first, ciphertext follows). The envelope is self-delimiting (CBOR is self-describing in length), so a reader can parse the envelope, determine its byte length, and treat the remainder of the blob as ciphertext.
- Q: What chunk size should the seekable encryption scheme use? → A: Configurable per-envelope with a default of 256 KiB. The chunk size is stored in the envelope metadata so readers can determine it without out-of-band information.
- Q: Should the library support streaming encryption/decryption? → A: Yes, streaming is required for both encrypt and decrypt paths, but deferred (not v1). The v1 API MUST be designed so streaming can be added without breaking changes, but the initial implementation may buffer entire payloads in memory.
- Q: How should the seekable chunked-AEAD scheme be identified in COSE? → A: Use the IANA private-use range (negative integers less than -65536) for the COSE `alg` header. COSE defines no seekable/chunked encryption (confirmed via research — see research-cose-seekable-encryption.md). The chunked-AEAD scheme follows the STREAM construction (Hoang et al., 2015), same pattern used by Tink and age. Formal IANA registration can be pursued alongside the FRC.
- Q: Should the library associate the original plaintext CID with the encrypted blob? → A: Optional. The envelope MAY contain the original plaintext CID in a COSE application header. This enables retrieval systems to verify decrypted content but is not required.
- Q: Should the library support standard IANA-registered AEAD schemes? → A: Yes. At least one off-the-shelf IANA-registered COSE AEAD algorithm (e.g., AES-256-GCM, COSE algorithm ID 3) MUST be supported as the simple (non-seekable) scheme. This ensures baseline interoperability with any COSE implementation without requiring custom algorithm support.

## User Scenarios & Testing

### User Story 1 - Encrypt Data for Storage (Priority: P1)

A data owner wants to encrypt a piece of content-addressed data before storing it in the Filecoin on-chain cloud. They provide the plaintext data and a symmetric content encryption key (CEK). The library encrypts the data using the chosen encryption scheme and produces an encrypted payload together with a COSE-based encryption envelope containing all metadata needed for decryption.

**Why this priority**: This is the foundational operation. Without encryption, no access control is possible. Every other capability depends on being able to produce encrypted content with a well-defined envelope.

**Independent Test**: Can be tested by encrypting a known plaintext with a known key and verifying the output contains a valid COSE envelope and that the ciphertext is not equal to the plaintext.

**Acceptance Scenarios**:

1. **Given** plaintext data and a valid CEK, **When** the user calls the encrypt function, **Then** the library produces encrypted output and a COSE encryption envelope containing the encryption scheme identifier, IV/nonce, and any scheme-specific parameters.
2. **Given** plaintext data and an invalid or undersized key, **When** the user calls the encrypt function, **Then** the library returns a clear error indicating the key is invalid.
3. **Given** the same plaintext encrypted twice with the same key, **When** comparing the two ciphertexts, **Then** they differ (due to unique nonces/IVs), but both decrypt to the same plaintext.

---

### User Story 2 - Decrypt Data from Storage (Priority: P1)

A data consumer who possesses the correct key wants to decrypt previously encrypted content-addressed data. They provide the encrypted payload, the COSE encryption envelope, and the CEK. The library reads the envelope to determine the encryption scheme and parameters, then decrypts and returns the plaintext.

**Why this priority**: Decryption is the complement to encryption and equally fundamental. The library is useless if encrypted data cannot be recovered.

**Independent Test**: Can be tested by round-tripping: encrypt known data, then decrypt and verify the output matches the original.

**Acceptance Scenarios**:

1. **Given** an encrypted payload, its COSE envelope, and the correct CEK, **When** the user calls the decrypt function, **Then** the library returns the original plaintext data.
2. **Given** an encrypted payload and an incorrect key, **When** the user calls the decrypt function, **Then** the library returns an authentication error (not corrupted plaintext).
3. **Given** an encrypted payload with a tampered ciphertext, **When** the user calls the decrypt function with the correct key, **Then** the library detects the tampering and returns an integrity error.

---

### User Story 3 - Attach Multiple Key Management Descriptors (Priority: P2)

A data owner wants to grant access to multiple parties or key management systems. They create an encryption envelope that contains multiple key management descriptors (e.g., one for a direct key holder, one for a Lit Protocol access condition, one for a future KMS). Each descriptor contains the wrapped CEK or a reference to where/how the CEK can be obtained for that party.

**Why this priority**: Multi-recipient and multi-KMS support is what makes the envelope format useful for decentralised access control. Without it, the system only supports single-key scenarios.

**Independent Test**: Can be tested by creating an envelope with two recipients, then verifying each recipient can independently derive/unwrap the CEK and decrypt the data.

**Acceptance Scenarios**:

1. **Given** encrypted data and two different recipient key-wrapping keys, **When** the user creates an envelope with both recipients, **Then** the envelope contains two key management descriptors, each with the CEK wrapped for that recipient.
2. **Given** an envelope with multiple recipients, **When** any single recipient provides their unwrapping key, **Then** they can recover the CEK and decrypt the data without needing the other recipients' keys.
3. **Given** an envelope with multiple recipients, **When** a non-recipient attempts decryption, **Then** the library returns an error indicating the key does not match any recipient.

---

### User Story 4 - Seekable Decryption of Large Data (Priority: P2)

A data consumer wants to read a specific byte range from a large encrypted file without downloading and decrypting the entire file. The encryption scheme supports random access (seekable encryption), and the envelope contains the parameters needed to decrypt any arbitrary range.

**Why this priority**: Large files are common in the Filecoin ecosystem. Requiring full download and decryption for partial reads is impractical and would limit adoption. This is a key differentiator over simple encrypt-everything schemes.

**Independent Test**: Can be tested by encrypting a large payload, then decrypting only a middle section and verifying it matches the corresponding plaintext bytes.

**Acceptance Scenarios**:

1. **Given** a large file encrypted with a seekable scheme, **When** the user requests decryption of byte range [offset, offset+length), **Then** the library returns exactly those decrypted bytes matching the original plaintext at that range.
2. **Given** a seekable-encrypted file, **When** the user decrypts multiple non-overlapping ranges, **Then** concatenating the decrypted ranges in order produces the same result as decrypting the full file and extracting those ranges.
3. **Given** a file encrypted with a non-seekable scheme, **When** the user attempts range decryption, **Then** the library returns an error indicating the scheme does not support random access.

---

### User Story 5 - Inspect Envelope Without Decrypting (Priority: P3)

A system component (e.g., a storage provider, gateway, or access control policy engine) wants to read the encryption metadata from an envelope without possessing the decryption key. They can determine the encryption scheme, list key management descriptors, and check compatibility without accessing the plaintext.

**Why this priority**: Enables infrastructure components to route, filter, and policy-check encrypted data without requiring key access. Important for the broader ecosystem but not required for basic encrypt/decrypt flows.

**Independent Test**: Can be tested by creating an encrypted envelope and parsing it without providing any key, verifying all metadata fields are accessible.

**Acceptance Scenarios**:

1. **Given** a COSE encryption envelope, **When** the user parses it without a key, **Then** the library returns the encryption scheme identifier, all key management descriptors (without unwrapped keys), and any additional metadata.
2. **Given** a malformed or truncated envelope, **When** the user attempts to parse it, **Then** the library returns a specific parsing error, not a crash or undefined behavior.

---

### Edge Cases

- What happens when the encryption envelope references an unknown or unsupported encryption scheme? The library must return a clear "unsupported scheme" error with the scheme identifier.
- What happens when the encrypted data is zero-length? The library should handle empty plaintext gracefully, producing a valid envelope and ciphertext that round-trips correctly.
- What happens when the envelope is valid but the ciphertext has been truncated? The library must detect this via authentication tag verification and return an integrity error.
- What happens when COSE envelope versioning changes? The library must include a version indicator and reject envelopes with unsupported versions with a clear error.

## Requirements

### Functional Requirements

- **FR-001**: The library MUST encrypt arbitrary byte sequences using a specified encryption scheme and content encryption key, producing ciphertext and a COSE-based encryption envelope.
- **FR-002**: The library MUST decrypt ciphertext given the corresponding COSE envelope and correct content encryption key, returning the original plaintext.
- **FR-003**: The library MUST use COSE (RFC 9052 / RFC 9053) as the encoding format for encryption envelopes, specifically COSE_Encrypt for multi-recipient and COSE_Encrypt0 for single-recipient scenarios. The COSE structure operates in detached-payload mode (ciphertext is not embedded in the COSE structure).
- **FR-004**: The encryption envelope MUST contain: the encryption algorithm identifier (from IANA COSE Algorithms registry), IV/nonce, and any scheme-specific parameters needed for decryption.
- **FR-015**: The library MUST produce output as a single contiguous blob consisting of the COSE envelope followed immediately by the ciphertext. The COSE envelope is CBOR-encoded and therefore self-delimiting; a reader MUST be able to parse the envelope, determine its byte length, and treat the remaining bytes as ciphertext.
- **FR-016**: The library MUST provide a function to parse the envelope from the beginning of a blob without reading the entire blob, enabling efficient metadata inspection of large encrypted objects.
- **FR-005**: The envelope MUST support multiple key management descriptors (COSE recipients), each containing: a key management algorithm identifier, wrapped CEK or key agreement parameters, and optional key identification metadata.
- **FR-006**: The library MUST support authenticated encryption (AEAD) schemes that detect tampering of ciphertext.
- **FR-007**: The library MUST support at least one seekable encryption scheme that enables decryption of arbitrary byte ranges without decrypting the entire payload. The scheme MUST follow the STREAM construction (per-chunk AEAD with nonce derived from chunk index and a last-chunk flag to prevent truncation/reordering attacks). The chunk size MUST be configurable per encryption operation, with a default of 256 KiB. The chosen chunk size MUST be recorded in the COSE envelope metadata so that any reader can determine it.
- **FR-018**: The seekable chunked-AEAD scheme MUST use a private-use algorithm identifier (value less than -65536) in the COSE `alg` header, as no standard COSE algorithm exists for chunked encryption. Scheme-specific parameters (chunk size, chunk count) MUST be conveyed via COSE header parameters.
- **FR-008**: The library MUST support at least one simple (non-seekable) authenticated encryption scheme that uses a standard IANA-registered COSE AEAD algorithm (e.g., AES-256-GCM, algorithm ID 3), ensuring baseline interoperability with any conformant COSE implementation.
- **FR-009**: The library MUST return distinct, actionable errors for: invalid key, authentication failure (tampered data), unsupported scheme, malformed envelope, and range-not-supported (for non-seekable schemes).
- **FR-010**: The library MUST allow parsing and inspecting envelope metadata without possessing a decryption key.
- **FR-011**: The library MUST generate cryptographically random nonces/IVs for each encryption operation, ensuring no nonce reuse under the same key.
- **FR-012**: The library MUST zero sensitive key material from memory after use, using buffer-filling techniques appropriate to the runtime (e.g., explicit TypedArray zeroing in JavaScript runtimes).
- **FR-013**: The envelope format MUST be versioned to allow future evolution without breaking existing consumers.
- **FR-014**: The library MUST decouple key management from the data encryption path — the library handles symmetric encryption and envelope construction, while key management (wrapping, unwrapping, distribution) is pluggable via a defined interface.
- **FR-017**: The v1 API MUST be designed such that streaming encrypt/decrypt can be added in a future version without breaking changes. The initial implementation MAY buffer entire payloads in memory.
- **FR-019**: The envelope MAY contain the original plaintext content identifier (CID) in a COSE application-specific header parameter. When present, the library SHOULD provide a utility to verify the decrypted output against this CID.

### Key Entities

- **Encryption Envelope**: A COSE_Encrypt or COSE_Encrypt0 structure in detached-payload mode, containing all metadata needed to decrypt data. Includes algorithm ID, IV, per-recipient key management descriptors, and optional application-specific metadata. Serialised as CBOR and prepended to the ciphertext in the output blob. This is the core data structure of the library.
- **Encrypted Blob**: The concatenation of [COSE envelope | ciphertext]. The canonical output and storage format. The envelope is self-delimiting via CBOR framing, so the ciphertext boundary is implicit.
- **Content Encryption Key (CEK)**: A symmetric key used for the actual data encryption. Generated by the data owner, optionally wrapped for each recipient. The library consumes and produces CEKs but does not manage their lifecycle.
- **Key Management Descriptor**: A COSE recipient structure within the envelope. Describes how a specific party can obtain the CEK (e.g., direct key, key wrapping, key agreement). Multiple descriptors enable multi-party access.
- **Encryption Scheme**: An identified algorithm with parameters. AES-256-GCM (COSE algorithm ID 3) for the simple scheme; a chunked-AES-256-GCM based on the STREAM construction for the seekable scheme (private-use COSE algorithm ID, to be formally registered via IANA alongside the FRC).

## Success Criteria

### Measurable Outcomes

- **SC-001**: All encrypt-then-decrypt round trips produce bit-identical output to the original plaintext, with zero data corruption across 100% of test cases.
- **SC-002**: Decryption with an incorrect key or tampered ciphertext is detected and rejected 100% of the time (no silent data corruption).
- **SC-003**: For seekable encryption, decrypting a 1KB range from a 1GB encrypted file requires reading and processing proportional to the range size (not the full file).
- **SC-004**: Encryption envelopes produced by the library are valid COSE structures that can be parsed by independent COSE implementations.
- **SC-005**: A developer unfamiliar with the library can encrypt data and produce a valid envelope within 30 minutes of reading the documentation.
- **SC-006**: The envelope format specification is complete enough that an independent implementation can interoperate with this library without access to the source code.

## Assumptions

- The library operates at the symmetric encryption layer only. Key generation, distribution, and access policy enforcement are handled by separate systems (e.g., Lit Protocol, Keypo, custom KMS).
- The primary data being encrypted is content-addressed (CID-identified) data in the Filecoin/IPFS ecosystem, but the library does not depend on or enforce CID semantics — it encrypts arbitrary byte sequences.
- COSE was chosen over alternatives (e.g., JWE, custom formats) because it is binary-efficient, IETF-standardized, supports multiple recipients natively, and has a well-defined algorithm registry.
- The seekable encryption scheme will be based on chunked AEAD (encrypting data in fixed-size chunks with per-chunk nonces derived from chunk index), enabling random access at chunk granularity. The default chunk size is 256 KiB, configurable per-envelope.
- The initial release will support AES-256-GCM as the simple AEAD scheme and a chunked-AES-256-GCM as the seekable scheme. Additional schemes can be added later via the pluggable scheme interface.
- The initial implementation language is TypeScript, targeting Node.js and browser runtimes via the Web Crypto API. Future implementations in other languages (Go, Rust) may follow.
- Nonce/IV generation relies on the platform's cryptographic random number generator (e.g., Web Crypto `getRandomValues`, Node.js `crypto.randomBytes`).
- The envelope format will be specified in sufficient detail to serve as the basis for a Filecoin Request for Comments (FRC) document.
