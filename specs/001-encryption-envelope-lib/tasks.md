# Tasks: Encryption Envelope Library

**Input**: Design documents from `/specs/001-encryption-envelope-lib/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-api.ts

**Tests**: Included — constitution mandates TDD (NON-NEGOTIABLE). Tests follow red-green-refactor cycle.

**Organization**: Tasks grouped by user story. US1+US2 are both P1 but in separate phases since US1 can be verified structurally without decryption.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Initialize green-field TypeScript project with pnpm, biome, vitest, wireit

- [ ] T001 Initialize project: create package.json with pnpm, ESM-only, wireit scripts, cborg dependency, vitest + biome devDependencies, exports field, engine >=20, license Apache-2.0 OR MIT per research R-011 in package.json
- [ ] T002 Create tsconfig.json with strict mode, verbatimModuleSyntax, erasableSyntaxOnly, target ESNext, module preserve, composite, declaration, outDir dist per research R-011 in tsconfig.json
- [ ] T003 [P] Configure biome: 2-space indent, single quotes, no semicolons, trailing commas es5, kebab-case filenames, 120 char width per research R-005 in biome.json
- [ ] T004 [P] Configure vitest in vitest.config.ts
- [ ] T005 Create directory structure: src/, src/cose/, src/schemes/, tests/unit/cose/, tests/unit/schemes/, tests/integration/, tests/contract/
- [ ] T006 Run pnpm install and verify build/lint/test wireit tasks execute successfully

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types, errors, crypto abstraction, and COSE encoding layer that ALL user stories depend on

**WARNING**: No user story work can begin until this phase is complete

### Tests

- [ ] T007 [P] Write failing unit tests for error classes: FocEncryptionError, InvalidKeyError, AuthenticationError, UnsupportedSchemeError, MalformedEnvelopeError, SchemeNotSeekableError — verify code property, inheritance, message in tests/unit/errors.test.ts
- [ ] T008 [P] Write failing unit tests for key validation: reject non-32-byte keys, reject all-zero keys, accept valid 32-byte keys in tests/unit/key-utils.test.ts
- [ ] T009 [P] Write failing unit tests for COSE header constants: verify CoseAlgorithm and CoseHeaderParam values match spec (-65790, -65791, -65792, -65793) in tests/unit/cose/headers.test.ts
- [ ] T010 [P] Write failing unit tests for Enc_structure AAD computation: build Encrypt0 and Encrypt context strings per RFC 9052 Section 5.3 in tests/unit/cose/structures.test.ts

### Implementation

- [ ] T011 [P] Implement core type definitions (CoseAlgorithmId, EncryptOptions, EnvelopeMetadata, ByteRange, Recipient, RecipientInfo, AppMetadata, BlobFetcher) per contracts/public-api.ts in src/types.ts
- [ ] T012 [P] Implement error classes with distinct code properties per FR-009 in src/errors.ts
- [ ] T013 [P] Implement Web Crypto abstraction: getRandomValues, subtle.encrypt/decrypt/importKey wrappers in src/crypto.ts
- [ ] T014 [P] Implement key validation (32-byte check, all-zero check) and key import with extractable:false, buffer zeroing after import per FR-012 in src/key-utils.ts
- [ ] T015 [P] Implement COSE header parameter constants (CoseAlgorithm, CoseHeaderParam, standard labels for alg/typ/iv) in src/cose/headers.ts
- [ ] T016 Implement Enc_structure (AAD) computation for Encrypt0 and Encrypt contexts per RFC 9052 Section 5.3 using cborg in src/cose/structures.ts
- [ ] T017 Implement encryption scheme interface: EncryptionScheme with encrypt/decrypt/name/algorithmId/isSeekable properties in src/schemes/scheme.ts

**Checkpoint**: Foundation ready — types, errors, crypto, COSE constants, AAD computation, scheme interface all in place. Tests green.

---

## Phase 3: User Story 1 — Encrypt Data for Storage (Priority: P1) MVP

**Goal**: Encrypt plaintext with AES-256-GCM, produce a valid COSE_Encrypt0 envelope concatenated with ciphertext as a single blob.

**Independent Test**: Encrypt known plaintext, verify output starts with valid CBOR (COSE_Encrypt0 tag 16), contains correct alg/typ/iv headers, and ciphertext differs from plaintext.

### Tests

- [ ] T018 [P] [US1] Write failing unit tests for COSE_Encrypt0 encoding: build envelope with protected headers (alg=3, typ), unprotected headers (iv), nil ciphertext, verify CBOR tag 16 and structure in tests/unit/cose/encode.test.ts
- [ ] T019 [P] [US1] Write failing unit tests for AES-256-GCM scheme: encrypt known plaintext, verify ciphertext length (plaintext + 16 tag bytes), verify unique IVs per call in tests/unit/schemes/aes-256-gcm.test.ts
- [ ] T020 [P] [US1] Write failing unit tests for blob assembly: envelope + ciphertext concatenation, verify decodeFirst parses envelope and remainder is ciphertext in tests/unit/blob.test.ts
- [ ] T021 [US1] Write failing integration test for encrypt: encrypt plaintext with valid CEK, verify output is valid blob, verify COSE envelope metadata, verify ciphertext != plaintext, verify two encryptions produce different ciphertexts (unique nonces) in tests/integration/encrypt-decrypt.test.ts

### Implementation

- [ ] T022 [P] [US1] Implement COSE_Encrypt0 envelope encoding: build protected header map (alg, typ), unprotected header map (iv, optional app_metadata/-65792), encode as CBOR Tagged(16, [protected_bstr, unprotected_map, null]) using cborg in src/cose/encode.ts
- [ ] T023 [P] [US1] Implement AES-256-GCM encryption scheme: generate 12-byte random IV, compute AAD via Enc_structure, call crypto.subtle.encrypt with AES-GCM params, return ciphertext+tag in src/schemes/aes-256-gcm.ts
- [ ] T024 [US1] Implement blob assembly: concatenate COSE envelope bytes + ciphertext bytes into single Uint8Array in src/blob.ts
- [ ] T025 [US1] Implement encrypt orchestration: validate CEK, select scheme by algorithm option, call scheme.encrypt, build COSE envelope, assemble blob, zero key material, return blob in src/envelope.ts
- [ ] T026 [US1] Export encrypt function and public types (CoseAlgorithm, EncryptOptions, error classes) from src/index.ts

**Checkpoint**: `encrypt()` produces valid encrypted blobs with COSE_Encrypt0 envelopes. All US1 tests green.

---

## Phase 4: User Story 2 — Decrypt Data from Storage (Priority: P1)

**Goal**: Decrypt an encrypted blob given the correct CEK, returning original plaintext. Detect wrong keys and tampered ciphertext.

**Independent Test**: Round-trip: encrypt known data, decrypt, verify bit-identical. Also verify wrong key → AuthenticationError, tampered ciphertext → AuthenticationError.

### Tests

- [ ] T027 [P] [US2] Write failing unit tests for COSE_Encrypt0 decoding: parse CBOR-tagged envelope via decodeFirst, extract protected/unprotected headers, verify alg/typ/iv extraction in tests/unit/cose/decode.test.ts
- [ ] T028 [P] [US2] Write failing unit tests for AES-256-GCM decryption: decrypt known ciphertext with known key/IV, verify plaintext; wrong key → AuthenticationError; tampered ciphertext → AuthenticationError in tests/unit/schemes/aes-256-gcm.test.ts
- [ ] T029 [US2] Write failing integration tests for decrypt round-trip: encrypt-then-decrypt various sizes (empty, 1 byte, 1 KiB, 1 MiB), wrong key error, tampered blob error in tests/integration/encrypt-decrypt.test.ts

### Implementation

- [ ] T030 [US2] Implement COSE envelope decoding: use cborg.decodeFirst on blob, validate CBOR tag (16 or 96), extract protected headers (decode inner bstr), extract unprotected headers, return parsed metadata + envelope byte length in src/cose/decode.ts
- [ ] T031 [US2] Implement blob parsing: decodeFirst to split envelope from ciphertext, return {metadata, ciphertext} in src/blob.ts
- [ ] T032 [US2] Implement AES-256-GCM decryption in scheme: compute AAD via Enc_structure, call crypto.subtle.decrypt, catch DOMException and throw AuthenticationError in src/schemes/aes-256-gcm.ts
- [ ] T033 [US2] Implement decrypt orchestration: parse blob, validate scheme supported, import CEK, select scheme, call scheme.decrypt with IV and AAD, zero key material, return plaintext in src/envelope.ts
- [ ] T034 [US2] Export decrypt function from src/index.ts

**Checkpoint**: Full encrypt→decrypt round-trip works. Wrong key and tampered data detected. All US1+US2 tests green.

---

## Phase 5: User Story 3 — Attach Multiple Key Management Descriptors (Priority: P2)

**Goal**: Support COSE_Encrypt with multiple COSE_recipient structures, each containing a wrapped CEK or key reference.

**Independent Test**: Create envelope with 2 recipients, verify each recipient's descriptor is present in parsed envelope, verify encrypt/decrypt still works with recipients attached.

### Tests

- [ ] T035 [P] [US3] Write failing unit tests for COSE_Encrypt encoding: build envelope with recipients array, verify CBOR tag 96, verify each recipient structure [protected, unprotected, ciphertext] in tests/unit/cose/encode.test.ts
- [ ] T036 [P] [US3] Write failing unit tests for COSE_Encrypt decoding: parse tag-96 envelope, extract recipients array with alg/kid/wrappedKey in tests/unit/cose/decode.test.ts
- [ ] T037 [US3] Write failing integration test: encrypt with 2 recipients, parse envelope, verify both recipient descriptors present, decrypt still works in tests/integration/multi-recipient.test.ts

### Implementation

- [ ] T038 [US3] Implement Recipient type definitions and validation in src/recipients.ts
- [ ] T039 [US3] Extend COSE encoding to support COSE_Encrypt (tag 96) with recipients array: each recipient is [protected_bstr, unprotected_map{alg, kid}, wrapped_cek_bstr] in src/cose/encode.ts
- [ ] T040 [US3] Extend COSE decoding to handle tag 96: parse 4th element as recipients array, extract RecipientInfo from each in src/cose/decode.ts
- [ ] T041 [US3] Update encrypt orchestration: when recipients provided, use COSE_Encrypt (tag 96) instead of COSE_Encrypt0 (tag 16) in src/envelope.ts
- [ ] T042 [US3] Export Recipient, RecipientInfo types from src/index.ts

**Checkpoint**: Multi-recipient envelopes produced and parsed correctly. All US1+US2+US3 tests green.

---

## Phase 6: User Story 4 — Seekable Decryption of Large Data (Priority: P2)

**Goal**: Chunked AES-256-GCM STREAM encryption enabling decryption of arbitrary byte ranges without decrypting the entire payload.

**Independent Test**: Encrypt a multi-chunk payload, decrypt a middle range, verify it matches the corresponding plaintext bytes. Verify range request on non-seekable scheme returns SchemeNotSeekableError.

### Tests

- [ ] T043 [P] [US4] Write failing unit tests for chunked AEAD scheme: encrypt multi-chunk data, verify chunk count, verify per-chunk nonce derivation (base_nonce + counter + last_flag), verify last chunk flag in tests/unit/schemes/chunked-aes-256-gcm.test.ts
- [ ] T044 [P] [US4] Write failing unit tests for COSE envelope with chunk headers: verify chunk_size (-65790) and chunk_count (-65791) in unprotected headers, verify alg=-65793 in protected headers in tests/unit/cose/encode.test.ts
- [ ] T045 [US4] Write failing integration tests for seekable encrypt/decrypt: full round-trip with chunked scheme, range decryption of middle chunk, range spanning chunk boundaries, first/last chunk ranges, non-seekable scheme → SchemeNotSeekableError in tests/integration/seekable.test.ts

### Implementation

- [ ] T046 [US4] Implement chunked AES-256-GCM STREAM encryption scheme: split plaintext into chunks, generate 7-byte base_nonce, derive per-chunk nonce (base_nonce[0..6] || chunk_index_4BE || last_flag_1B), encrypt each chunk with AES-GCM using per-chunk nonce and AAD, concatenate chunk ciphertexts in src/schemes/chunked-aes-256-gcm.ts
- [ ] T047 [US4] Implement chunked scheme full decryption: parse chunk_size/chunk_count from metadata, derive per-chunk nonces, decrypt each chunk, concatenate plaintexts in src/schemes/chunked-aes-256-gcm.ts
- [ ] T048 [US4] Implement chunked scheme range decryption: compute affected chunk indices from byte range, decrypt only those chunks, slice to exact requested range in src/schemes/chunked-aes-256-gcm.ts
- [ ] T049 [US4] Extend COSE encoding: when algorithm is -65793, add chunk_size (-65790) and chunk_count (-65791) to unprotected headers, use 7-byte IV in src/cose/encode.ts
- [ ] T050 [US4] Extend COSE decoding: extract chunk_size and chunk_count from unprotected headers when present in src/cose/decode.ts
- [ ] T051 [US4] Implement decryptRange orchestration: parse blob, verify seekable, compute chunk range, decrypt affected chunks via scheme, slice result in src/envelope.ts
- [ ] T052 [US4] Implement BlobFetcher support in decryptRange: accept BlobFetcher or Uint8Array, use fetchEnvelope/fetchRange for partial reads in src/envelope.ts
- [ ] T053 [US4] Export decryptRange, BlobFetcher, ByteRange, ChunkedEncryptOptions, SchemeNotSeekableError from src/index.ts

**Checkpoint**: Chunked encryption + full and range decryption works. All US1–US4 tests green.

---

## Phase 7: User Story 5 — Inspect Envelope Without Decrypting (Priority: P3)

**Goal**: Parse and expose all envelope metadata (algorithm, IV, recipients, chunk params, app_metadata) without requiring a decryption key.

**Independent Test**: Create encrypted blob, call parseEnvelope without any key, verify all metadata fields accessible. Verify malformed input → MalformedEnvelopeError.

### Tests

- [ ] T054 [P] [US5] Write failing unit tests for parseEnvelope: parse simple envelope metadata (alg, iv, seekable=false, envelopeSize), parse chunked envelope metadata (chunkSize, chunkCount, seekable=true), parse app_metadata with CID, parse multi-recipient envelope (recipients array), malformed blob → MalformedEnvelopeError, truncated blob → MalformedEnvelopeError in tests/unit/blob.test.ts
- [ ] T055 [US5] Write failing contract test: produce COSE_Encrypt0 and COSE_Encrypt envelopes, verify they are valid COSE parseable by cborg independently (SC-004), verify CBOR tags, verify protected header round-trips in tests/contract/cose-interop.test.ts

### Implementation

- [ ] T056 [US5] Implement parseEnvelope public API: call blob.parse to get metadata, populate EnvelopeMetadata including seekable flag derived from algorithm, extract app_metadata map from unprotected headers if present in src/envelope.ts
- [ ] T057 [US5] Export parseEnvelope, EnvelopeMetadata, AppMetadata from src/index.ts

**Checkpoint**: Full envelope inspection without keys. COSE interop validated. All US1–US5 tests green.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, security hardening, documentation, final validation

- [ ] T058 [P] Add edge case tests: empty plaintext round-trip, single-byte plaintext, plaintext exactly chunk_size, plaintext exactly N*chunk_size (no partial last chunk), unsupported scheme error with algorithm ID in tests/integration/encrypt-decrypt.test.ts
- [ ] T059 [P] Add edge case tests for chunked scheme: single-chunk file (smaller than chunk_size), chunk_size=1 (degenerate), very large chunk_count validation in tests/unit/schemes/chunked-aes-256-gcm.test.ts
- [ ] T060 Audit and verify key material zeroing: ensure CEK source buffer is zeroed after importKey in all encrypt/decrypt/decryptRange paths per FR-012 in src/key-utils.ts and src/envelope.ts
- [ ] T061 [P] Add app_metadata with CID round-trip test: encrypt with appMetadata.cid set, parse envelope, verify CID bytes match in tests/integration/encrypt-decrypt.test.ts
- [ ] T062 [P] Add JSDoc documentation to all public API exports in src/index.ts per constitution principle I
- [ ] T063 Validate quickstart.md examples compile and run correctly against the built library
- [ ] T064 Final CI validation: verify pnpm build && pnpm lint && pnpm test all pass cleanly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **US1 Encrypt (Phase 3)**: Depends on Phase 2
- **US2 Decrypt (Phase 4)**: Depends on Phase 3 (needs encrypt to produce test blobs)
- **US3 Multi-recipient (Phase 5)**: Depends on Phase 4 (extends working encrypt/decrypt)
- **US4 Seekable (Phase 6)**: Depends on Phase 4 (extends working encrypt/decrypt). Independent of US3.
- **US5 Inspect (Phase 7)**: Depends on Phase 4 (needs blobs to inspect). Independent of US3/US4.
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only
- **US2 (P1)**: Depends on US1 (needs encrypt to test decrypt)
- **US3 (P2)**: Depends on US2. Independent of US4, US5.
- **US4 (P2)**: Depends on US2. Independent of US3, US5.
- **US5 (P3)**: Depends on US2. Independent of US3, US4.

```
Phase 1 → Phase 2 → Phase 3 (US1) → Phase 4 (US2) ─┬─→ Phase 5 (US3) ──┬─→ Phase 8
                                                      ├─→ Phase 6 (US4) ──┤
                                                      └─→ Phase 7 (US5) ──┘
```

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD)
2. COSE layer changes before scheme changes
3. Scheme before orchestration
4. Orchestration before public exports

### Parallel Opportunities

**Phase 2**: T007–T010 (tests) all parallel, T011–T015 (implementations) all parallel
**Phase 3**: T018–T020 (tests) parallel, T022–T023 (COSE encode + AES scheme) parallel
**Phase 4**: T027–T028 (tests) parallel
**Phase 5**: T035–T036 (tests) parallel
**Phase 6**: T043–T044 (tests) parallel
**After Phase 4**: US3, US4, US5 can proceed in parallel (independent stories)

---

## Parallel Example: Phase 2 (Foundational)

```
# Launch all foundational tests in parallel:
T007: Unit tests for error classes in tests/unit/errors.test.ts
T008: Unit tests for key validation in tests/unit/key-utils.test.ts
T009: Unit tests for COSE headers in tests/unit/cose/headers.test.ts
T010: Unit tests for Enc_structure in tests/unit/cose/structures.test.ts

# After tests written, launch parallel implementations:
T011: Type definitions in src/types.ts
T012: Error classes in src/errors.ts
T013: Crypto abstraction in src/crypto.ts
T014: Key utilities in src/key-utils.ts
T015: COSE headers in src/cose/headers.ts
```

## Parallel Example: After Phase 4

```
# Three user stories can proceed simultaneously:
Developer A: Phase 5 (US3 Multi-recipient) — T035→T042
Developer B: Phase 6 (US4 Seekable)        — T043→T053
Developer C: Phase 7 (US5 Inspect)          — T054→T057
```

---

## Implementation Strategy

### MVP First (US1 + US2)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 (Encrypt)
4. Complete Phase 4: US2 (Decrypt)
5. **STOP and VALIDATE**: encrypt→decrypt round-trip with AES-256-GCM
6. This is a usable library for simple encryption scenarios

### Incremental Delivery

1. Setup + Foundational → project builds and lints
2. US1 + US2 → basic encrypt/decrypt works (MVP)
3. US3 → multi-recipient support
4. US4 → seekable chunked encryption for large files
5. US5 → envelope inspection for infrastructure components
6. Polish → edge cases, docs, CI

### Parallel Team Strategy

1. Team completes Setup + Foundational + US1 + US2 together (serial — tightly coupled)
2. After US2:
   - Developer A: US3 (Multi-recipient)
   - Developer B: US4 (Seekable)
   - Developer C: US5 (Inspect)
3. All reconvene for Polish phase

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story
- Constitution mandates TDD: write failing tests BEFORE implementation
- Commit after each task or logical group
- All crypto uses Web Crypto API (async) — no Node.js-only crypto
- Key material MUST be zeroed after use (FR-012)
- COSE structures built manually on cborg (no COSE library — R-002)
