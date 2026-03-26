# Quickstart: foc-demo CLI

## Installation

```bash
# From the repository root
pnpm install
pnpm --filter foc-demo build
```

## Local Encryption / Decryption

### Encrypt a file with a password

```bash
foc-demo encrypt myfile.pdf --password "my secret passphrase" --output myfile.pdf.enc
```

### Encrypt a file with a hex key

```bash
foc-demo encrypt myfile.pdf --key a1b2c3...64hexchars... --output myfile.pdf.enc
```

### Decrypt a local file

```bash
foc-demo decrypt myfile.pdf.enc --password "my secret passphrase" --output myfile.pdf
```

## Upload to FOC (Encrypt + Upload)

```bash
# Set wallet private key (or use --private-key flag)
export FOC_PRIVATE_KEY=0xabcdef...

foc-demo upload myfile.pdf --password "my secret passphrase"
# Output:
#   Encrypting myfile.pdf (1.2 MB, chunked AES-256-GCM)...
#   Uploading encrypted blob (1.2 MB)...
#   Stored: baga6ea4seaq...
#   PieceCID: baga6ea4seaq...
#   Retrieval URL: https://...
```

## Download from FOC (Download + Decrypt)

### Using PieceCID (requires wallet)

```bash
foc-demo download baga6ea4seaq... --password "my secret passphrase" --output myfile.pdf
# Output:
#   Resolving PieceCID via synapse-sdk...
#   Downloading from https://provider.example/piece/baga6ea4seaq...
#   Decrypting (chunked AES-256-GCM, 5 chunks)...
#   Written to myfile.pdf (1.2 MB)
```

### Using HTTP URL (no wallet needed, shareable)

```bash
foc-demo download https://provider.example/piece/baga6ea4seaq... \
  --password "my secret passphrase" --output myfile.pdf
# Output:
#   Downloading from https://provider.example/piece/baga6ea4seaq...
#   Decrypting (chunked AES-256-GCM, 5 chunks)...
#   Written to myfile.pdf (1.2 MB)
```

## Range Decrypt (Seekable)

```bash
# With HTTP URL (no wallet)
foc-demo range https://provider.example/piece/baga6ea4seaq... \
  --password "my secret passphrase" --offset 0 --length 1024 --output header.bin

# With PieceCID (requires wallet)
foc-demo range baga6ea4seaq... --password "my secret passphrase" \
  --offset 0 --length 1024 --output header.bin
# Output:
#   Fetching envelope from baga6ea4seaq...
#   Decrypting range [0, 1024) (chunks 0-0 of 5)...
#   Written to header.bin (1024 bytes)
```

## Error Handling

```bash
# Wrong password
foc-demo decrypt myfile.pdf.enc --password "wrong password"
# Error: Authentication failed — wrong key or corrupted data

# Non-seekable file with range command
foc-demo range baga6ea4seaq... --key abc... --offset 0 --length 100
# Error: File was encrypted with AES-256-GCM (non-seekable). Use 'download' for full decryption.

# Missing key/password
foc-demo encrypt myfile.pdf
# Error: Provide either --password or --key
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FOC_PRIVATE_KEY` | Wallet private key for synapse-sdk (alternative to `--private-key` flag) |
