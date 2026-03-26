# Feature Spec: CLI Demo for FOC Encryption

**Branch**: `003-cli-demo` | **Date**: 2026-03-26

## Overview

A demonstration CLI tool that showcases the foc-encryption library's encrypt/decrypt workflow integrated with synapse-sdk for file upload and download. The CLI lives as a separate sub-project (`demo/`) within the repository.

## User Stories

### US-001: Encrypt and Upload

As a user, I want to encrypt a local file and upload it to FOC warm storage so that my data is stored confidentially on the network.

**Acceptance Criteria**:
- CLI accepts a file path and either a hex key or a password
- When a password is provided, derive a 256-bit key using PBKDF2-SHA256 (Web Crypto native, 600 000 iterations, random 16-byte salt prepended to output)
- Encrypt the file using foc-encryption (chunked mode for files > 256 KiB, simple mode otherwise)
- Upload the encrypted blob via synapse-sdk; print periodic progress log lines to stderr (e.g., `Uploading... 50% (524288/1048576 bytes)`)
- Print the PieceCID and envelope metadata to stdout in human-readable text format (e.g., `PieceCID: bafy...\nAlgorithm: chunked-aes-256-gcm\nChunks: 4\nSize: 1048576 bytes`)

### US-002: Download and Decrypt

As a user, I want to download an encrypted file from FOC storage and decrypt it locally so that I can access my data.

**Acceptance Criteria**:
- CLI accepts either a PieceCID (requires wallet connection) or an HTTP retrieval URL (no wallet needed, works for shared links)
- CLI accepts either a hex key or a password
- When given a PieceCID, resolve retrieval URL via synapse-sdk (requires `--private-key` / `FOC_PRIVATE_KEY`)
- When given an HTTP URL, fetch directly (no wallet required)
- When a password is provided, derive the key using PBKDF2-SHA256 (same parameters as US-001)
- Print periodic progress log lines to stderr during download (e.g., `Downloading... 50%`)
- Decrypt using foc-encryption
- Write the plaintext to a specified output file (or stdout)
- Display meaningful errors for wrong key, corrupted data, or network failures; no retries — fail fast with a clear error message and non-zero exit code

### US-003: Encrypt-Only (Local)

As a user, I want to encrypt a file locally without uploading so that I can inspect the encrypted output or upload it later through other means.

**Acceptance Criteria**:
- CLI accepts a file path and key/password
- Writes encrypted blob to an output file
- Prints envelope metadata in human-readable text format (algorithm, chunk count, size)

### US-004: Decrypt-Only (Local)

As a user, I want to decrypt a local encrypted blob without downloading so that I can work with previously downloaded or locally encrypted files.

**Acceptance Criteria**:
- CLI accepts an encrypted blob file path and key/password
- Writes decrypted plaintext to output file or stdout
- Clear error messages for invalid envelope, wrong key, etc.

### US-005: Range Decrypt (Seekable Files)

As a user, I want to decrypt a byte range of a remote encrypted file so that I can access a portion without downloading the entire file.

**Acceptance Criteria**:
- CLI accepts either a PieceCID (requires wallet) or HTTP retrieval URL, plus key/password, offset, and length
- Uses BlobFetcher + decryptRange for partial download
- Writes the decrypted range to output file or stdout
- Errors clearly if the file was not encrypted with a seekable scheme

### US-006: Documentation

As a user, I want clear documentation for the demo CLI so that I can set it up and use it without reading the source code.

**Acceptance Criteria**:
- `demo/README.md` with setup prerequisites (Node.js, pnpm, funded wallet for upload)
- Build and installation instructions
- Usage examples for all commands
- Explanation of PieceCID vs HTTP URL for retrieval
- Environment variable reference

## Clarifications

### Session 2026-03-26

- Q: Which KDF to use for password-based key derivation? → A: PBKDF2-SHA256 (Web Crypto native, 600 000 iterations, random 16-byte salt)
- Q: What format should stdout output use for PieceCID and envelope metadata? → A: Human-readable text
- Q: Should the CLI show progress during large file upload/download? → A: Simple periodic log lines to stderr
- Q: Should the CLI retry on network failures? → A: No retries; fail fast with clear error and non-zero exit code
- Q: Which CLI framework to use? → A: cleye (matches synapse-sdk examples)

## Non-Goals

- Key management / wallet setup (user provides key or password directly)
- Payment management (assumes funded account, errors if not)
- Multi-recipient encryption (single-key demo only)
- GUI or TUI interface

## Technical Constraints

- Must use the foc-encryption library from the parent project (workspace reference or path import)
- Must use `@filoz/synapse-sdk` for network operations
- CLI framework: `cleye` (matches synapse-sdk examples)
- Sub-project in `demo/` directory with its own package.json
- ESM-only, TypeScript, same tooling conventions as parent project
