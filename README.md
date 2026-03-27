# foc-encryption

**Client-side encryption for the Filecoin On-chain Cloud (FOC)**

Encrypt files locally, store them on Filecoin warm storage, and share them via a link — all without trusting a server with your plaintext data. Recipients decrypt in-browser using only a password.

## Live Demo

Try it now — open the viewer and enter the password `hardPasswordSure`:

[**Open encrypted content in viewer**](https://bafybeifmoyptennzufqyp2id3ufa4yfyumrrz7ci4ok4sufwltggzy24nu.ipfs.dweb.link/#url=https%3A%2F%2Fcalib2.ezpdpz.net%2Fpiece%2Fbafkzcibeudqbmed2hq75hjwry67454ubmecbcqltv7mhvxh7yaw2ztvvqjbhjeeyei)

The viewer is a single HTML file hosted on IPFS. The encrypted blob lives on Filecoin warm storage. Decryption happens entirely in your browser.

## How It Works

```
                       FOC Warm Storage (Filecoin)
                              ┌─────────┐
  encrypt ──► upload ────────►│encrypted│
                              │  blob   │
  viewer  ◄── download ◄─────│         │
  (IPFS)      + decrypt       └─────────┘
     │           ▲
     │     PBKDF2 key
     │     derivation
     ▼
  plaintext
  in browser
```

1. **Encrypt** — files are encrypted client-side with AES-256-GCM, wrapped in a [COSE](https://datatracker.ietf.org/doc/rfc9052/) envelope (CBOR-encoded)
2. **Store** — encrypted blobs are uploaded to Filecoin warm storage via [synapse-sdk](https://github.com/filoz/synapse-sdk)
3. **Share** — generate a link containing the retrieval URL (and optionally the password)
4. **View** — the viewer SPA (a single HTML file, also hosted on IPFS) fetches the blob, derives the key via PBKDF2, decrypts in-browser, and renders the content

No server ever sees the plaintext. The encryption envelope follows [RFC 9052 (COSE)](https://datatracker.ietf.org/doc/rfc9052/) to enable future interoperability with other key management solutions.

## Key Features

- **Standards-based encryption** — COSE envelopes with AES-256-GCM, CBOR serialization
- **Seekable decryption** — large files (>256 KiB) use chunked encryption, enabling efficient HTTP Range-based partial decryption
- **Zero-trust sharing** — encrypted at rest on Filecoin; decryption happens only in the recipient's browser
- **Self-contained viewer** — single HTML file with inlined JS, hostable anywhere (IPFS, S3, local file)
- **Password or raw key** — PBKDF2-derived keys for passwords (600K iterations, SHA-256), or bring your own 256-bit key
- **Multi-recipient support** — COSE_Encrypt envelopes can wrap keys for multiple recipients

## Packages

| Package | Description |
|---------|-------------|
| [`foc-encryption`](packages/foc-encryption/) | Core library — AES-256-GCM encryption envelopes with CBOR/COSE serialization |
| [`foc-demo`](packages/foc-demo/) | CLI tool — encrypt, decrypt, upload, download, and range-decrypt files via FOC |
| [`foc-viewer`](packages/foc-viewer/) | Web viewer — single-file SPA that decrypts and renders content in-browser |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+

### Build

```bash
pnpm install
pnpm build
```

### Encrypt and upload a file

```bash
# Set your Filecoin Calibration testnet wallet key
export PRIVATE_KEY=0xabcdef...

# Encrypt and upload
node packages/foc-demo/dist/cli.js upload myfile.pdf --password "my secret"
# → PieceCID:      baga6ea4seaq...
# → Retrieval URL: https://calib2.ezpdpz.net/piece/baga6ea4seaq...
```

### Share it

The retrieval URL can be opened directly in the viewer — no wallet needed:

```
https://bafybeifmoyptennzufqyp2id3ufa4yfyumrrz7ci4ok4sufwltggzy24nu.ipfs.dweb.link/#url=<retrieval-url>&pw=<password>
```

Or share the link without the password and let the recipient enter it manually.

### Local encrypt/decrypt (no Filecoin)

```bash
# Encrypt
node packages/foc-demo/dist/cli.js encrypt myfile.pdf --password "secret" --output myfile.pdf.enc

# Decrypt
node packages/foc-demo/dist/cli.js decrypt myfile.pdf.enc --password "secret" --output myfile.pdf
```

See [`packages/foc-demo/README.md`](packages/foc-demo/README.md) for full CLI documentation.

## Architecture

```
packages/
├── foc-encryption/    Core library (encrypt, decrypt, COSE envelopes)
│   └── used by both foc-demo and foc-viewer
├── foc-demo/          CLI for encrypt/decrypt/upload/download
│   └── uses synapse-sdk for Filecoin storage
└── foc-viewer/        Browser SPA for decrypting shared content
    └── built as a single HTML file via Vite
```

### Encryption Format

The binary blob is structured as:

```
[COSE Envelope (CBOR)] [Ciphertext]
```

- **Small files (≤256 KiB):** AES-256-GCM — single encrypt/decrypt
- **Large files (>256 KiB):** Chunked AES-256-GCM — seekable, supports HTTP Range decryption

The COSE envelope contains the algorithm identifier, IV, recipient key info, and application metadata (e.g. PBKDF2 salt). This design decouples key management from the data path, allowing future integration with distributed key management solutions like [Lit Protocol](https://litprotocol.com/).

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpx biome check .   # lint + format
```

## License

Apache-2.0 OR MIT
