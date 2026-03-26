# CLI Contract: foc-demo

## Command Schema

### Global Flags

None. All flags are command-specific.

---

### `encrypt <file>`

Encrypt a local file without uploading.

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--password`, `-p` | string | one of key/password | — | Encryption password (PBKDF2) |
| `--key`, `-k` | string | one of key/password | — | Hex-encoded 256-bit key |
| `--output`, `-o` | string | no | `<file>.enc` | Output file path |

**Positional**: `<file>` — path to the file to encrypt (required)

**Exit codes**: 0 = success, 1 = error

**Stdout**: Envelope metadata (algorithm, size, chunk count if seekable)

---

### `decrypt <file>`

Decrypt a local encrypted blob.

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--password`, `-p` | string | one of key/password | — | Decryption password |
| `--key`, `-k` | string | one of key/password | — | Hex-encoded 256-bit key |
| `--output`, `-o` | string | no | `<file>` minus `.enc` suffix | Output file path |

**Positional**: `<file>` — path to the encrypted blob (required)

**Exit codes**: 0 = success, 1 = error

---

### `upload <file>`

Encrypt a local file and upload to FOC warm storage.

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--password`, `-p` | string | one of key/password | — | Encryption password |
| `--key`, `-k` | string | one of key/password | — | Hex-encoded 256-bit key |
| `--private-key` | string | no | `$FOC_PRIVATE_KEY` | Wallet private key |

**Positional**: `<file>` — path to the file to encrypt and upload (required)

**Exit codes**: 0 = success, 1 = error

**Stdout**: PieceCID, retrieval URL, algorithm, sizes

---

### `download <locator>`

Download an encrypted blob from FOC and decrypt it.

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--password`, `-p` | string | one of key/password | — | Decryption password |
| `--key`, `-k` | string | one of key/password | — | Hex-encoded 256-bit key |
| `--output`, `-o` | string | yes | — | Output file path |
| `--private-key` | string | no | `$FOC_PRIVATE_KEY` | Wallet private key (required only when using PieceCID) |

**Positional**: `<locator>` — either a PieceCID (requires wallet) or an HTTP retrieval URL (no wallet needed)

**Locator detection**: If the value starts with `http://` or `https://`, treat as URL. Otherwise treat as PieceCID.

**Exit codes**: 0 = success, 1 = error

---

### `range <locator>`

Decrypt a byte range from a remote seekable encrypted blob.

| Flag | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `--password`, `-p` | string | one of key/password | — | Decryption password |
| `--key`, `-k` | string | one of key/password | — | Hex-encoded 256-bit key |
| `--offset` | number | yes | — | Start byte offset in plaintext |
| `--length` | number | yes | — | Number of bytes to decrypt |
| `--output`, `-o` | string | no | stdout | Output file path |
| `--private-key` | string | no | `$FOC_PRIVATE_KEY` | Wallet private key (required only when using PieceCID) |

**Positional**: `<locator>` — either a PieceCID (requires wallet) or an HTTP retrieval URL (no wallet needed)

**Locator detection**: Same as `download` — HTTP(S) prefix = URL, otherwise = PieceCID.

**Exit codes**: 0 = success, 1 = error

**Error**: If blob uses non-seekable scheme, exit 1 with message suggesting `download` command instead.

---

## Error Message Format

All errors are written to stderr in the format:

```
Error: <actionable message>
```

Examples:
- `Error: Provide either --password or --key`
- `Error: Authentication failed — wrong key or corrupted data`
- `Error: File was encrypted with AES-256-GCM (non-seekable). Use 'download' for full decryption.`
- `Error: FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.`
- `Error: Output directory does not exist: /nonexistent/path`
