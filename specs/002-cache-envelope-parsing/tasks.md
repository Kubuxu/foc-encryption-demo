# Tasks: Cache Envelope Parsing for decryptRange

**Input**: Design documents from `/specs/002-cache-envelope-parsing/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution (TDD is NON-NEGOTIABLE).

**Organization**: Single user story (US1). This is a focused refactor — no setup or foundational phases needed (project already exists).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 - Separate Envelope Parsing from Range Decryption (Priority: P1)

**Goal**: Refactor `decryptRange` to require pre-parsed `EnvelopeMetadata`, remove the `Uint8Array` path, and make `parseEnvelope` accept `BlobFetcher`.

**Independent Test**: Parse envelope once from a BlobFetcher, call `decryptRange` multiple times with different ranges, verify all return correct plaintext and that envelope is only fetched once.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T001 [P] [US1] Add `protectedHeaders` assertion to existing `parseEnvelope` tests — test that `parseEnvelope` returns `protectedHeaders` field in `tests/integration/seekable.test.ts`
- [X] T002 [P] [US1] Write test for `parseEnvelope(fetcher: BlobFetcher)` async path — verify it calls `fetchEnvelope()` once and returns correct `EnvelopeMetadata` with `protectedHeaders` in `tests/integration/seekable.test.ts`
- [X] T003 [P] [US1] Write test for new `decryptRange(fetcher, metadata, cek, range)` signature — verify it decrypts correctly when given pre-parsed metadata and a BlobFetcher in `tests/integration/seekable.test.ts`
- [X] T004 [P] [US1] Write test verifying envelope is fetched only once across multiple `decryptRange` calls — use a counting BlobFetcher wrapper in `tests/integration/seekable.test.ts`
- [X] T005 [P] [US1] Write test that `decryptRange` throws `SchemeNotSeekableError` when metadata has non-seekable algorithm in `tests/integration/seekable.test.ts`

### Implementation for User Story 1

- [X] T006 [US1] Add `protectedHeaders: Uint8Array` field to `EnvelopeMetadata` interface in `src/types.ts`
- [X] T007 [US1] Update `parseEnvelope` to include `protectedHeaders` in returned metadata and accept `Uint8Array | BlobFetcher` (async for BlobFetcher) in `src/envelope.ts`
- [X] T008 [US1] Update `parseEnvelope` export signature/type in `src/index.ts` if needed
- [X] T009 [US1] Refactor `decryptRange` to new signature `(fetcher: BlobFetcher, metadata: EnvelopeMetadata, cek: CEKBytes, range: ByteRange)` — remove `Uint8Array` path, remove internal envelope parsing, use metadata directly in `src/envelope.ts`
- [X] T010 [US1] Migrate all existing `decryptRange` test call sites to new signature in `tests/integration/seekable.test.ts`
- [X] T011 [US1] Remove any dead code from old `decryptRange` implementation (Uint8Array branch, internal `parseBlob`/`decodeCoseEnvelope` calls) in `src/envelope.ts`

**Checkpoint**: All tests pass. `decryptRange` requires pre-parsed metadata, `parseEnvelope` supports BlobFetcher, no Uint8Array path remains.

---

## Phase 2: Polish & Cross-Cutting Concerns

- [X] T012 Run `npx biome check .` and fix any lint/format issues
- [X] T013 Run full test suite (`npm test`) and verify all pass
- [X] T014 Validate quickstart.md examples match final API in `specs/002-cache-envelope-parsing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No prerequisites — project already exists
- **Phase 2 (Polish)**: Depends on Phase 1 completion

### Within User Story 1

- T001–T005 (tests) can all run in parallel — they target the same file but different test cases
- T006 (type change) must come before T007–T009 (implementation)
- T007 (`parseEnvelope`) must come before T009 (`decryptRange` refactor) since decryptRange depends on the new parseEnvelope
- T009 (refactor) must come before T010 (migrate tests) and T011 (cleanup)
- T010 and T011 can run in parallel

### Parallel Opportunities

```text
Parallel group 1: T001, T002, T003, T004, T005 (all test writing)
Sequential:       T006 → T007 → T008 → T009
Parallel group 2: T010, T011 (test migration + dead code removal)
Sequential:       T012 → T013 → T014
```

---

## Implementation Strategy

### MVP (this is a single-story feature)

1. Write failing tests (T001–T005)
2. Implement type change (T006)
3. Implement `parseEnvelope` changes (T007–T008)
4. Refactor `decryptRange` (T009)
5. Migrate existing tests (T010) and clean up dead code (T011)
6. Validate and polish (T012–T014)

---

## Notes

- [P] tasks = different files or independent test cases, no dependencies
- Constitution requires TDD: tests T001–T005 must fail before T006–T011 implementation
- Commit after each logical group per user feedback (commit per phase)
- Single user story — no cross-story dependencies to manage
