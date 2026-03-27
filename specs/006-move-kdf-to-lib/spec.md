# Feature Specification: Move Key Derivation Function to Encryption Library

**Feature Branch**: `006-move-kdf-to-lib`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Move key derivation function to @packages/foc-encryption/ to encourage compatibility."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Library Consumer Uses KDF Directly (Priority: P1)

A developer building their own tool or application that works with foc-encryption envelopes needs to derive a content encryption key (CEK) from a password, so they can encrypt or decrypt files without depending on the CLI demo package.

**Why this priority**: This is the core motivation of the feature — enabling compatibility across different consumers of foc-encryption envelopes. Without this, any independent implementation must re-invent PBKDF2 with matching parameters (600,000 iterations, SHA-256, 16-byte salt), risking interoperability failures.

**Independent Test**: Can be tested by importing `deriveKey` from `foc-encryption` in a standalone script, deriving a key from a known password and salt, and verifying the output matches the expected 32-byte CEK.

**Acceptance Scenarios**:

1. **Given** a password string and no existing salt, **When** `deriveKey` is called, **Then** a 32-byte CEK and a randomly generated 16-byte salt are returned.
2. **Given** a password string and an existing 16-byte salt, **When** `deriveKey` is called with that salt, **Then** the same 32-byte CEK is returned each time (deterministic).
3. **Given** a 64-character hex string representing a raw key, **When** `deriveKey` is called with `kind: 'hex'`, **Then** the hex is decoded to a 32-byte CEK with no salt.

---

### User Story 2 - CLI Demo Delegates to Library KDF (Priority: P2)

The existing `foc-demo` CLI continues to work without any user-visible change after the KDF is moved to the library — the demo simply imports the function from `foc-encryption`.

**Why this priority**: Ensures the refactor does not regress existing CLI functionality. The demo is the primary end-to-end integration point.

**Independent Test**: All existing tests in `foc-demo` for key derivation continue to pass after the change.

**Acceptance Scenarios**:

1. **Given** a user runs the demo CLI with `--password`, **When** they encrypt a file, **Then** decryption with the same password succeeds identically to pre-refactor behavior.
2. **Given** the demo's existing key-derivation unit tests, **When** the tests run after the move, **Then** all tests pass without modification to test logic.

---

### Edge Cases

- What happens when `deriveKey` is called with an invalid hex key (wrong length or non-hex characters)? An error with a descriptive message must be thrown.
- What happens when the salt provided is not 16 bytes? The function must handle this consistently with the existing implementation.
- What happens if the library is imported in a browser or non-Node environment that has Web Crypto API? The function must work correctly since it relies only on `crypto.subtle`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The `foc-encryption` library MUST export a `deriveKey` function with the same signature and behavior as the current implementation in `foc-demo`.
- **FR-002**: The `foc-encryption` library MUST export the `KeySource` type and `DerivedKey` interface.
- **FR-003**: The `hexToBytes` helper MUST be internal to `foc-encryption` and NOT part of its public entry point; it may be imported directly by intra-package tests.
- **FR-004**: The KDF implementation MUST use PBKDF2 with SHA-256, 600,000 iterations, and a 16-byte salt to ensure interoperability with existing encrypted envelopes.
- **FR-005**: The `foc-demo` package MUST be updated to import its key derivation logic from `foc-encryption` rather than maintaining a duplicate implementation.
- **FR-006**: The new exports MUST be accessible from the `foc-encryption` package's main entry point.
- **FR-007**: KDF unit tests MUST move to `foc-encryption` to test the function at its new home; `foc-demo` MUST retain a minimal smoke test verifying the import wiring works end-to-end.

### Key Entities

- **`KeySource`**: Union type representing either a hex-encoded raw key (`kind: 'hex'`) or a password (`kind: 'password'`).
- **`DerivedKey`**: Interface containing the derived 32-byte `cek` and an optional 16-byte `salt` (present for password-derived keys).
- **`deriveKey`**: Async function accepting a `KeySource` and an optional existing salt, returning a `DerivedKey`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A consumer of `foc-encryption` can derive a key from a password using only the library, with zero imports from `foc-demo`.
- **SC-002**: KDF unit tests pass in `foc-encryption`; a smoke test in `foc-demo` confirms the import wiring is correct. No test logic modifications are required beyond moving files and updating import paths.
- **SC-003**: A key derived using the old `foc-demo` code path and a key derived via the new library export produce identical output for the same password and salt inputs.
- **SC-004**: The `foc-demo` package contains no duplicate KDF logic — all key derivation is delegated to `foc-encryption`.

## Clarifications

### Session 2026-03-27

- Q: Where should KDF tests live after the move? → A: Move KDF unit tests to `foc-encryption`; `foc-demo` retains a minimal smoke test.
- Q: Should `hexToBytes` be part of the public API of `foc-encryption`? → A: No — keep it internal; tests may import it directly from its module path within the package.

## Assumptions

- The `parseKeySource` helper (which parses CLI flags) is CLI-specific and will remain in `foc-demo`; only the cryptographic derivation logic and its types move to the library.
- The Web Crypto API (`crypto.subtle`) is available in all target runtime environments for `foc-encryption` (Node.js ≥ 20 and modern browsers).
- No versioned release or changelog entry is required as part of this task — the library is not yet published to npm.
- The `hexToBytes` function moves alongside `deriveKey` since it is a direct dependency of the derivation logic.
