# Feature Specification: Cache Envelope Parsing for decryptRange

**Feature Branch**: `002-cache-envelope-parsing`
**Created**: 2026-03-26
**Status**: Draft
**Input**: User description: "Currently decryptRange requests and parses the envelope each time. We should avoid that."

## Clarifications

### Session 2026-03-26

- Q: Should the Uint8Array path be kept, changed to require pre-parsed metadata, or removed? → A: Remove the Uint8Array path entirely. If the caller has everything in memory, they don't need `decryptRange` — regular `decrypt` with a slice suffices.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Separate Envelope Parsing from Range Decryption (Priority: P1)

A developer using the library performs multiple `decryptRange` calls on the same encrypted blob via a BlobFetcher (e.g., seeking through a large encrypted file stored remotely). The `decryptRange` interface is changed so that envelope parsing is an explicit, separate step the developer performs once upfront. The parsed envelope metadata is then passed into each `decryptRange` call, which only handles chunk fetching and decryption.

**Why this priority**: This is the core change. The current `decryptRange` interface hides envelope fetching and parsing internally, causing redundant work on every call. By making envelope parsing an explicit separate step, the developer has full control and the interface is honest about what's happening.

**Independent Test**: Can be tested by parsing an envelope once, then performing multiple `decryptRange` calls with that parsed metadata, verifying all return correct plaintext and that no additional envelope fetching occurs.

**Acceptance Scenarios**:

1. **Given** an encrypted blob accessed via a BlobFetcher, **When** the developer parses the envelope once and then performs 10 sequential `decryptRange` calls for different byte ranges passing the parsed metadata, **Then** only one envelope fetch/parse occurs and all 10 calls return correct decrypted data.
2. **Given** a parsed envelope metadata object, **When** `decryptRange` is called, **Then** it accepts the pre-parsed metadata directly and does not fetch or parse any envelope data.
3. **Given** the new `decryptRange` interface, **When** a developer calls it without first parsing the envelope, **Then** the call fails at compile time (type error) because the parsed envelope is a required parameter.

---

### Edge Cases

- What happens when parsed envelope metadata is used with a mismatched BlobFetcher? Decryption will fail naturally due to wrong nonces or authentication tag mismatches. The caller is responsible for correct pairing.
- How does the system handle concurrent `decryptRange` calls sharing the same parsed envelope metadata? The metadata is read-only, so concurrent use is safe without synchronization.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `decryptRange` interface MUST be changed so that parsed envelope metadata is an explicit required input, not fetched internally.
- **FR-002**: The system MUST provide a function to parse the envelope from a BlobFetcher, returning the metadata needed for range decryption.
- **FR-003**: The parsed envelope metadata MUST include all information needed for range decryption: envelope size, chunk size, chunk count, IV, and algorithm identifier.
- **FR-004**: `decryptRange` MUST NOT fetch or parse the envelope itself; it only performs chunk calculation, fetching, and decryption.
- **FR-005**: `decryptRange` MUST only accept a BlobFetcher for data access; the Uint8Array path MUST be removed. Callers with full blobs in memory should use `decrypt` instead.
- **FR-006**: All existing call sites and tests MUST be updated to the new interface.
- **FR-007**: Decryption results MUST be identical to the current implementation for the same inputs.

### Key Entities

- **Parsed Envelope Metadata**: A reusable, read-only object returned by the envelope parsing step. Contains everything `decryptRange` needs: envelope size, chunk parameters, IV, and algorithm. Passed explicitly by the caller into each `decryptRange` call.
- **BlobFetcher**: The existing interface for fetching envelope bytes and ciphertext ranges. The `fetchEnvelope()` method is used once during the parsing step; subsequent `decryptRange` calls only use `fetchRange()`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Multiple `decryptRange` calls on the same blob result in exactly one envelope fetch and parse, with all subsequent calls only fetching ciphertext chunks.
- **SC-002**: All tests pass after migration to the new interface.
- **SC-003**: Decrypted output is byte-for-byte identical to the current implementation for the same inputs.

## Assumptions

- Encrypted blobs are immutable once created; envelope metadata does not change between calls.
- This is a breaking API change to `decryptRange`; there is no backward-compatible overload.
- The Content Encryption Key (CEK) is managed separately by the caller and is not part of the parsed envelope metadata.
- The existing `parseEnvelope()` function may already expose sufficient metadata, or may need to be extended to include all fields `decryptRange` requires.
- Callers with full blobs in memory use `decrypt` (not `decryptRange`), so the Uint8Array code path is unnecessary.
