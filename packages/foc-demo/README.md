# foc-demo CLI

A command-line tool for encrypting files with [foc-encryption](../../README.md) and storing them on [Filecoin Onchain Cloud (FOC)](https://filecoin.io) warm storage via [synapse-sdk](https://github.com/filoz/synapse-sdk).

## Prerequisites

- Node.js 20+
- pnpm 9+
- A funded Filecoin Calibration testnet wallet (required for `upload`, `download` with PieceCID, and `range` with PieceCID)

## Build

```bash
# From the repository root
pnpm install
pnpm --filter foc-demo build
```

After building, the CLI is available at `packages/foc-demo/dist/cli.js`:

```bash
node packages/foc-demo/dist/cli.js --help
```

## Commands

### `encrypt` — Encrypt a local file

```bash
# With a password (PBKDF2-derived key, salt stored in blob)
node packages/foc-demo/dist/cli.js encrypt myfile.pdf --password "my secret passphrase" --output myfile.pdf.enc

# With a raw hex key (64 hex characters = 256-bit key)
node packages/foc-demo/dist/cli.js encrypt myfile.pdf --key a1b2c3...64hexchars... --output myfile.pdf.enc

# Default output path is <input>.enc
node packages/foc-demo/dist/cli.js encrypt myfile.pdf --password "passphrase"
# → writes myfile.pdf.enc
```

Files ≤ 256 KiB use AES-256-GCM. Files > 256 KiB use Chunked AES-256-GCM (seekable — enables `range` command).

### `decrypt` — Decrypt a local encrypted blob

```bash
# With matching password
node packages/foc-demo/dist/cli.js decrypt myfile.pdf.enc --password "my secret passphrase" --output myfile.pdf

# With raw hex key
node packages/foc-demo/dist/cli.js decrypt myfile.pdf.enc --key a1b2c3...64hexchars... --output myfile.pdf

# Default output path strips .enc suffix (adds .dec if no .enc suffix)
node packages/foc-demo/dist/cli.js decrypt myfile.pdf.enc --password "passphrase"
# → writes myfile.pdf
```

### `upload` — Encrypt and upload to FOC warm storage

Requires a Filecoin wallet with USDFC balance for storage payments.

```bash
export FOC_PRIVATE_KEY=0xabcdef...  # or use --private-key flag

node packages/foc-demo/dist/cli.js upload myfile.pdf --password "my secret passphrase"
# Output:
#   Encrypting myfile.pdf (1.2 MB, chunked AES-256-GCM)...
#   Uploading encrypted blob (1.2 MB)...
#   PieceCID:       baga6ea4seaq...
#   Retrieval URL:  https://...

node packages/foc-demo/dist/cli.js upload myfile.pdf --key a1b2c3...64hexchars... --private-key 0xabcdef...
```

The PieceCID and Retrieval URL are both printed. The Retrieval URL can be shared and used without a wallet.

### `download` — Download and decrypt from FOC

```bash
# Using HTTP Retrieval URL (no wallet needed — shareable)
node packages/foc-demo/dist/cli.js download https://provider.example/piece/baga6ea4seaq... \
  --password "my secret passphrase" --output myfile.pdf

# Using PieceCID (requires wallet to resolve to a URL)
export FOC_PRIVATE_KEY=0xabcdef...
node packages/foc-demo/dist/cli.js download baga6ea4seaq... \
  --password "my secret passphrase" --output myfile.pdf

# With hex key
node packages/foc-demo/dist/cli.js download https://provider.example/piece/baga6ea4seaq... \
  --key a1b2c3...64hexchars... --output myfile.pdf
```

### `range` — Decrypt a byte range (seekable blobs only)

Efficiently decrypts a byte range from a chunked-encrypted blob using HTTP Range requests. Only works on files encrypted in chunked mode (> 256 KiB).

```bash
# Using HTTP URL (no wallet needed)
node packages/foc-demo/dist/cli.js range https://provider.example/piece/baga6ea4seaq... \
  --password "my secret passphrase" --offset 0 --length 1024 --output header.bin

# Using PieceCID (requires wallet)
export FOC_PRIVATE_KEY=0xabcdef...
node packages/foc-demo/dist/cli.js range baga6ea4seaq... \
  --password "my secret passphrase" --offset 0 --length 1024 --output header.bin

# Output to stdout (omit --output)
node packages/foc-demo/dist/cli.js range https://provider.example/piece/baga6ea4seaq... \
  --key a1b2c3...64hexchars... --offset 4096 --length 256
```

## PieceCID vs HTTP URL

| | PieceCID | HTTP URL |
|---|---|---|
| Requires wallet | Yes | No |
| Shareable | No (needs wallet to resolve) | Yes |
| Example | `baga6ea4seaq...` | `https://provider.example/piece/baga6ea4seaq...` |

After `upload`, both are printed. Save the HTTP URL to share access without a wallet.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FOC_PRIVATE_KEY` | Wallet private key for synapse-sdk (alternative to `--private-key` flag). Used by `upload`, `download` (PieceCID), and `range` (PieceCID). |
| `RPC_URL` | Filecoin RPC endpoint (default: Calibration testnet via glif.io) |

## Error Troubleshooting

**Wrong password or key:**
```
Error: Authentication failed — wrong key or corrupted data
```
Ensure you use the same password or key that was used during encryption.

**Missing key or password:**
```
Error: Provide either --password or --key
```
Every encrypt/decrypt command requires one of `--password` or `--key`.

**Range on non-seekable file:**
```
Error: File was encrypted with AES-256-GCM (non-seekable). Use 'download' for full decryption.
```
Only files > 256 KiB are encrypted in chunked (seekable) mode. Use `download` for small files.

**Missing wallet for PieceCID:**
```
Error: FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.
```
Set `FOC_PRIVATE_KEY` or pass `--private-key 0x...` when using PieceCID locators.
