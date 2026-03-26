# Tasks: CLI Demo for FOC Encryption

**Input**: Design documents from `/specs/003-cli-demo/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Included per constitution (TDD required).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the demo sub-project with pnpm workspace, TypeScript, and dependencies

- [ ] T001 Add `packages` field to root `pnpm-workspace.yaml` with entries `['.', 'demo']`
- [ ] T002 Create `demo/package.json` with `foc-encryption: "workspace:*"`, `cleye`, `@filoz/synapse-sdk`, `viem` dependencies; `"type": "module"`, `"private": true`
- [ ] T003 Create `demo/tsconfig.json` with strict mode, ESM, project reference to parent (`{ "path": ".." }`)
- [ ] T004 Run `pnpm install` to resolve workspace links and generate lockfile updates
- [ ] T005 [P] Create `demo/src/cli.ts` with cleye setup — define all 5 subcommands (encrypt, decrypt, upload, download, range) with flags per cli-contract.md, dispatch stubs that print "not implemented"
- [ ] T006 [P] Create `demo/vitest.config.ts` matching parent project pattern (test files in `demo/tests/**/*.test.ts`)

**Checkpoint**: `pnpm --filter foc-demo build` succeeds, `node demo/dist/cli.js --help` prints usage, `pnpm --filter foc-demo test` runs (no tests yet)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared modules used by multiple commands — key handling, locator parsing, synapse client, utilities

**CRITICAL**: No user story work can begin until this phase is complete

- [ ] T007 Write failing tests for hex key parsing and PBKDF2 derivation in `demo/tests/unit/key.test.ts` — test hex validation (64 chars, invalid hex), PBKDF2 produces 32-byte key, same password+salt = same key, different salt = different key
- [ ] T008 Implement `demo/src/key.ts` — `parseKeySource(flags)` returns `KeySource`, `deriveKey(source, existingSalt?)` returns `DerivedKey` using Web Crypto PBKDF2 (600k iterations, SHA-256, 16-byte salt), `hexToBytes(hex)` for key parsing
- [ ] T009 Write failing tests for locator parsing in `demo/tests/unit/locator.test.ts` — HTTP URL detection, PieceCID detection, edge cases (https vs http, no protocol)
- [ ] T010 Implement `demo/src/locator.ts` — `parseLocator(input)` returns `PieceLocator`, `resolveUrl(locator, synapse?)` returns HTTP URL string (passthrough for URL kind, synapse resolution for PieceCID kind)
- [ ] T011 [P] Implement `demo/src/synapse.ts` — `createSynapseClient(config)` using `Synapse.create()` + `privateKeyToAccount()`, `createBlobFetcher(url)` returning `BlobFetcher` with HTTP Range fetch
- [ ] T012 [P] Implement `demo/src/util.ts` — `formatError(err)` for actionable error messages, `formatSize(bytes)` for human-readable sizes, `autoSelectAlgorithm(fileSize)` returning encrypt options (chunked if >256KiB)

**Checkpoint**: All unit tests pass. `parseKeySource`, `deriveKey`, `parseLocator`, `createBlobFetcher`, `formatError` are functional.

---

## Phase 3: User Story 3 — Encrypt-Only Local (Priority: P1) MVP

**Goal**: Encrypt a local file to an output blob without network interaction — the simplest end-to-end path through the CLI

**Independent Test**: `foc-demo encrypt testfile.txt --key <64-hex-chars> --output testfile.txt.enc` produces a valid foc-encryption blob; `foc-demo encrypt testfile.txt --password "test" --output testfile.txt.enc` also works and stores PBKDF2 salt in appMetadata

### Tests for US3

- [ ] T013 [US3] Write failing integration test in `demo/tests/integration/encrypt-decrypt.test.ts` — encrypt a small file (<256KiB) with hex key, verify output is valid foc-encryption blob (parseable envelope); encrypt with password, verify salt in appMetadata

### Implementation for US3

- [ ] T014 [US3] Implement `demo/src/commands/encrypt.ts` — read file, resolve key, auto-select algorithm, call `foc-encryption.encrypt()`, write blob to output, print metadata (algorithm, plaintext size, blob size, chunk count if seekable)
- [ ] T015 [US3] Wire encrypt command in `demo/src/cli.ts` — replace stub dispatch with import of encrypt handler
- [ ] T016 [US3] Verify integration test from T013 passes; manually test with a real file

**Checkpoint**: `foc-demo encrypt` works end-to-end with both key and password modes. Integration test green.

---

## Phase 4: User Story 4 — Decrypt-Only Local (Priority: P2)

**Goal**: Decrypt a local encrypted blob — completes the local round-trip with US3

**Independent Test**: Encrypt a file with US3, then `foc-demo decrypt testfile.txt.enc --key <key> --output decrypted.txt` produces identical plaintext

### Tests for US4

- [ ] T017 [US4] Extend integration test in `demo/tests/integration/encrypt-decrypt.test.ts` — full round-trip: encrypt then decrypt with hex key, verify plaintext matches; encrypt with password then decrypt with same password, verify match; wrong password returns actionable error

### Implementation for US4

- [ ] T018 [US4] Implement `demo/src/commands/decrypt.ts` — read blob, parse envelope to extract appMetadata (PBKDF2 salt if present), resolve key (using salt from envelope for password mode), call `foc-encryption.decrypt()`, write plaintext to output
- [ ] T019 [US4] Wire decrypt command in `demo/src/cli.ts`
- [ ] T020 [US4] Verify integration tests pass; manually test encrypt→decrypt round-trip

**Checkpoint**: Local encrypt→decrypt round-trip works. Both hex key and password modes. Error messages for wrong key are actionable.

---

## Phase 5: User Story 1 — Encrypt and Upload (Priority: P3)

**Goal**: Encrypt a file and upload it to FOC warm storage via synapse-sdk

**Independent Test**: `foc-demo upload testfile.pdf --password "secret" --private-key 0x...` prints PieceCID and retrieval URL

### Tests for US1

- [ ] T021 [US1] Write failing integration test in `demo/tests/integration/upload-download.test.ts` — mock `@filoz/synapse-sdk` `Synapse.create()` and `storage.upload()`, verify encrypt is called before upload, verify PieceCID is returned, verify retrieval URL is printed

### Implementation for US1

- [ ] T022 [US1] Implement `demo/src/commands/upload.ts` — read file, resolve key, auto-select algorithm, encrypt, create synapse client (from `--private-key` or `FOC_PRIVATE_KEY`), call `synapse.storage.upload(blob)`, print PieceCID + retrieval URL + metadata
- [ ] T023 [US1] Wire upload command in `demo/src/cli.ts`
- [ ] T024 [US1] Verify integration test passes

**Checkpoint**: Upload command works with mocked synapse-sdk. Output includes PieceCID and retrieval URL.

---

## Phase 6: User Story 2 — Download and Decrypt (Priority: P4)

**Goal**: Download an encrypted blob from FOC and decrypt it, accepting either PieceCID or HTTP URL

**Independent Test**: `foc-demo download <url> --password "secret" --output file.pdf` downloads and decrypts; `foc-demo download <pieceCid> --password "secret" --private-key 0x... --output file.pdf` resolves CID then downloads

### Tests for US2

- [ ] T025 [US2] Extend integration test in `demo/tests/integration/upload-download.test.ts` — mock download: upload a blob then download by mocked URL, verify plaintext matches; test URL locator path (no wallet); test PieceCID locator path (with wallet)

### Implementation for US2

- [ ] T026 [US2] Implement `demo/src/commands/download.ts` — parse locator, resolve to URL (via synapse if PieceCID), fetch blob, parse envelope for salt, resolve key, decrypt, write to output file
- [ ] T027 [US2] Wire download command in `demo/src/cli.ts`
- [ ] T028 [US2] Verify integration tests pass

**Checkpoint**: Download+decrypt works for both URL and PieceCID locators. Round-trip upload→download verified with mocks.

---

## Phase 7: User Story 5 — Range Decrypt (Priority: P5)

**Goal**: Decrypt a byte range from a remote seekable blob using BlobFetcher + HTTP Range requests

**Independent Test**: `foc-demo range <url> --password "secret" --offset 0 --length 1024 --output header.bin` fetches only the needed chunks and decrypts the range

### Tests for US5

- [ ] T029 [US5] Write failing integration test in `demo/tests/integration/range.test.ts` — mock HTTP server returning Range responses, encrypt a file in chunked mode, verify range decryption returns correct plaintext slice; verify error when used on non-seekable blob

### Implementation for US5

- [ ] T030 [US5] Implement `demo/src/commands/range.ts` — parse locator, resolve URL, create BlobFetcher, parse envelope for salt + seekability check, resolve key, call `foc-encryption.decryptRange()`, write to output or stdout
- [ ] T031 [US5] Wire range command in `demo/src/cli.ts`
- [ ] T032 [US5] Verify integration test passes

**Checkpoint**: Range decryption works for chunked blobs. Clear error for non-seekable blobs.

---

## Phase 8: User Story 6 — Documentation (Priority: P6)

**Goal**: Comprehensive README for the demo CLI

**Independent Test**: A new user can follow README to build, run, and use all commands

### Implementation for US6

- [ ] T033 [US6] Create `demo/README.md` — prerequisites (Node.js 20+, pnpm, funded Filecoin Calibration wallet for upload), build instructions (`pnpm install && pnpm --filter foc-demo build`), usage examples for all 5 commands, PieceCID vs HTTP URL explanation, environment variables reference (`FOC_PRIVATE_KEY`), error troubleshooting section

**Checkpoint**: README is complete and accurate. All command examples match actual CLI behavior.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup and validation

- [ ] T034 [P] Verify all commands handle missing `--key`/`--password` with actionable error message
- [ ] T035 [P] Verify `--private-key` / `FOC_PRIVATE_KEY` errors are clear when wallet is needed but not provided
- [ ] T036 Run full test suite: `pnpm --filter foc-demo test`
- [ ] T037 Run linting: `npx biome check demo/`
- [ ] T038 Run quickstart.md scenarios manually and verify output matches documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US3 Encrypt-Only (Phase 3)**: Depends on Foundational — MVP, first testable increment
- **US4 Decrypt-Only (Phase 4)**: Depends on US3 (shares integration test file, needs encrypted blobs to decrypt)
- **US1 Upload (Phase 5)**: Depends on Foundational + synapse.ts — can run in parallel with US3/US4
- **US2 Download (Phase 6)**: Depends on US1 (shares test file) + locator.ts
- **US5 Range (Phase 7)**: Depends on Foundational + BlobFetcher — can run in parallel with US1/US2
- **US6 Documentation (Phase 8)**: Depends on all commands being implemented
- **Polish (Phase 9)**: Depends on all user stories

### User Story Dependencies

- **US3 (Encrypt-Only)**: Foundation only — first to implement
- **US4 (Decrypt-Only)**: Foundation only — can parallel with US3 but test benefits from US3 output
- **US1 (Upload)**: Foundation + synapse.ts — independent of US3/US4
- **US2 (Download)**: Foundation + locator.ts + synapse.ts — independent of US3/US4 but shares test pattern with US1
- **US5 (Range)**: Foundation + BlobFetcher — independent of all other stories
- **US6 (Documentation)**: All commands must exist

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- Shared modules (key.ts, locator.ts) before command handlers
- Command handler before CLI wiring
- Integration test green before checkpoint

### Parallel Opportunities

- T005 + T006 (CLI stub + vitest config) — different files
- T011 + T012 (synapse.ts + util.ts) — different files, no shared deps
- T034 + T035 (error handling validation) — independent checks
- US1 (Upload) and US5 (Range) can run in parallel after Foundation
- US3 (Encrypt) and US1 (Upload) can run in parallel after Foundation

---

## Parallel Example: Foundational Phase

```
# These can run in parallel (different files):
Task T011: "Implement synapse client factory in demo/src/synapse.ts"
Task T012: "Implement shared utilities in demo/src/util.ts"
```

## Parallel Example: After Foundation

```
# These user stories can start in parallel:
US3 (Phase 3): Encrypt-Only — local, no network deps
US1 (Phase 5): Upload — requires synapse.ts but independent of encrypt-only
US5 (Phase 7): Range Decrypt — requires BlobFetcher but independent of others
```

---

## Implementation Strategy

### MVP First (US3: Encrypt-Only)

1. Complete Phase 1: Setup (workspace, deps, CLI stub)
2. Complete Phase 2: Foundational (key.ts, locator.ts, synapse.ts, util.ts)
3. Complete Phase 3: US3 Encrypt-Only
4. **STOP and VALIDATE**: `foc-demo encrypt` works end-to-end
5. Demo local encryption capability

### Incremental Delivery

1. Setup + Foundational → Framework ready
2. US3 Encrypt-Only → Local encryption works (MVP!)
3. US4 Decrypt-Only → Local round-trip works
4. US1 Upload → Network upload works
5. US2 Download → Full network round-trip works
6. US5 Range → Seekable demo complete
7. US6 Documentation → Ready for external users
8. Polish → Production-quality

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each phase per user feedback preference
- Stop at any checkpoint to validate story independently
