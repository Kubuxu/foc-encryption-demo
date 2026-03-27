# foc-encryption

COSE-based encryption envelopes for content-addressed data in the [Filecoin On-chain Cloud (FOC)](https://filecoin.io) ecosystem.

## Packages

| Package | Description |
|---------|-------------|
| [`packages/foc-encryption`](packages/foc-encryption/) | Core library — AES-256-GCM encryption envelopes with CBOR serialization |
| [`packages/foc-demo`](packages/foc-demo/) | CLI demo — encrypt, decrypt, upload and download files via FOC warm storage |

## Requirements

- Node.js 20+
- pnpm 10+

## Quick Start

```bash
pnpm install
pnpm build        # build all packages
pnpm test         # test all packages
```

To use the CLI demo after building:

```bash
node packages/foc-demo/dist/cli.js --help
```

See [`packages/foc-demo/README.md`](packages/foc-demo/README.md) for full CLI documentation.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpx biome check .   # lint
```

## License

Apache-2.0 OR MIT
