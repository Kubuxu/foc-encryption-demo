# Tasks: Encrypted Content Viewer SPA

**Input**: Design documents from `/specs/005-encrypted-viewer-spa/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Unit tests included for core logic (fragment parsing, content-type detection) per constitution TDD requirement. UI/DOM tested manually.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Exact file paths included in descriptions

## Phase 1: Setup

**Purpose**: Initialize the viewer workspace package with Vite, TypeScript, and foc-encryption dependency

- [ ] T001 Create viewer workspace package with package.json, tsconfig.json, and add to pnpm-workspace.yaml in viewer/
- [ ] T002 Configure Vite for single-file HTML output in viewer/vite.config.ts
- [ ] T003 Create entry HTML shell with minimal inline CSS (centered container, form styles, error styles) in viewer/index.html
- [ ] T004 [P] Configure Vitest for viewer tests in viewer/vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules that ALL user stories depend on -- fragment parsing, decryption pipeline, content-type detection, and UI primitives

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests (TDD -- write first, verify they fail)

- [ ] T005 [P] Write unit tests for fragment encode/decode (round-trips, missing password, malformed, special characters) in viewer/tests/fragment.test.ts
- [ ] T006 [P] Write unit tests for content-type detection from magic bytes (PNG, JPEG, GIF, WebP, PDF, HTML, plain text, binary fallback) in viewer/tests/render.test.ts

### Implementation

- [ ] T007 [P] Implement fragment encode/decode module (`parseFragment`, `buildFragment`) in viewer/src/fragment.ts
- [ ] T008 [P] Implement content-type detection (`detectContentType`) from magic bytes in viewer/src/render.ts
- [ ] T009 Implement decrypt pipeline (fetch blob, parse envelope, extract PBKDF2 salt, derive CEK, decrypt) in viewer/src/decrypt.ts
- [ ] T010 Implement UI primitives (showForm, showPasswordPrompt, showLoading, showError, renderContent) in viewer/src/ui.ts

**Checkpoint**: All foundational modules built and tested. `pnpm run test` passes in viewer/.

---

## Phase 3: User Story 1 - Direct Content Viewing via Shared Link (Priority: P1) 🎯 MVP

**Goal**: Open a URL with `#url=...&pw=...` fragment and automatically fetch, decrypt, and display content.

**Independent Test**: Open `http://localhost:5173/#url=<test-blob-url>&pw=<password>` -- content displays automatically with no interaction.

### Implementation

- [ ] T011 [US1] Implement main entry point: on page load, parse fragment, detect `auto-decrypt` mode, call decrypt pipeline, render result in viewer/src/main.ts
- [ ] T012 [US1] Wire up error handling for fetch failures and decryption errors (AuthenticationError → "Wrong password", network error → "Could not fetch") in viewer/src/main.ts

**Checkpoint**: US1 fully functional. Auto-decrypt from shared link works end-to-end.

---

## Phase 4: User Story 2 - Manual Content Viewing (Priority: P1)

**Goal**: Show form when no fragment is present. User enters URL + password, clicks "View Content", content is displayed, and fragment is updated.

**Independent Test**: Open `http://localhost:5173/` with no fragment -- form appears. Enter URL and password, click "View Content" -- content displays and URL updates.

### Implementation

- [ ] T013 [US2] Add `manual-entry` mode to main.ts: show form via ui.ts, handle "View Content" submit → decrypt pipeline → renderContent → update fragment in viewer/src/main.ts
- [ ] T014 [US2] Update URL fragment after successful decrypt using `history.replaceState` and `buildFragment` in viewer/src/main.ts

**Checkpoint**: US1 + US2 both work. Manual entry form and auto-decrypt from fragment.

---

## Phase 5: User Story 3 - Link Generation for Sharing (Priority: P2)

**Goal**: User enters URL + optional password, clicks "Copy Link", shareable URL is copied to clipboard with confirmation.

**Independent Test**: Open page, enter URL and password, click "Copy Link" -- clipboard contains correct `#url=...&pw=...` URL. Paste into new tab -- auto-decrypts.

### Implementation

- [ ] T015 [US3] Add "Copy Link" button handler: build fragment from form values, construct full URL, copy to clipboard, show confirmation in viewer/src/main.ts and viewer/src/ui.ts

**Checkpoint**: US1 + US2 + US3 all work. Link generation and copy to clipboard functional.

---

## Phase 6: User Story 4 - Password Prompt for Partial Links (Priority: P2)

**Goal**: Open URL with `#url=...` (no password) -- show password prompt with URL read-only. After entering password, decrypt and display.

**Independent Test**: Open `http://localhost:5173/#url=<test-blob-url>` -- password prompt appears. Enter password -- content displays and fragment updates.

### Implementation

- [ ] T016 [US4] Add `password-prompt` mode to main.ts: detect URL-only fragment, show password prompt via ui.ts, on submit → decrypt pipeline → renderContent → update fragment in viewer/src/main.ts

**Checkpoint**: All 4 user stories work independently and together.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Content-type rendering for non-HTML types, edge cases, build verification

- [ ] T017 [P] Implement content rendering by type: HTML (replace DOM), images (centered `<img>` + download), PDF (`<embed>` + download), text (`<pre>` + download), binary (download only) in viewer/src/render.ts
- [ ] T018 [P] Add loading indicator (shown during fetch+decrypt) in viewer/src/ui.ts
- [ ] T019 Build and verify single-file output with `pnpm run build`, confirm viewer/dist/index.html works standalone
- [ ] T020 Verify all tests pass, biome check passes, build succeeds: `npx biome check . && pnpm run test && pnpm run build` from viewer/

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies -- start immediately
- **Foundational (Phase 2)**: Depends on Setup -- BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational
- **US2 (Phase 4)**: Depends on Foundational (can parallel with US1 but shares main.ts)
- **US3 (Phase 5)**: Depends on Foundational
- **US4 (Phase 6)**: Depends on Foundational
- **Polish (Phase 7)**: After all user stories

### User Story Dependencies

- **US1 (P1)**: No dependencies on other stories
- **US2 (P1)**: Shares main.ts with US1 -- best done sequentially after US1
- **US3 (P2)**: Independent of US1/US2 (only needs fragment.ts + ui.ts)
- **US4 (P2)**: Independent of US1/US2 (only needs fragment.ts + ui.ts + decrypt.ts)

### Parallel Opportunities

- T005 + T006: Tests can be written in parallel
- T007 + T008 + T009 + T010: All foundational modules target different files
- T015 + T016: US3 and US4 can be implemented in parallel
- T017 + T018: Polish tasks target different files

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T010)
3. Complete Phase 3: US1 (T011-T012)
4. **STOP and VALIDATE**: Auto-decrypt from shared link works end-to-end
5. Demo-ready with core functionality

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Auto-decrypt works (MVP!)
3. Add US2 → Manual entry works
4. Add US3 + US4 → Link sharing and partial links work
5. Polish → Content-type rendering, loading states, build verification

---

## Notes

- [P] tasks = different files, no dependencies
- Commit after each phase per user preference
- This is a demo -- keep implementation minimal
- All source files in viewer/src/, tests in viewer/tests/
- Content-type rendering (T017) is deferred to Polish since US1-US4 work with HTML content initially
