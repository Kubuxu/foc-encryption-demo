# Synapse SDK Research

## Overview

`@filoz/synapse-sdk` is the official JavaScript/TypeScript SDK for **Filecoin Onchain Cloud** (FOC). Published by FilOzone, current version ~0.40.0. Licensed Apache-2.0 OR MIT.

Three packages:
- `@filoz/synapse-sdk` — main SDK (depends on `@filoz/synapse-core` + `multiformats`)
- `@filoz/synapse-core` — standard library / low-level primitives
- `@filoz/synapse-react` — React hooks integration

**Key concepts**: Service Providers, Warm Storage, Data Sets (collections of pieces), Pieces (data units identified by PieceCID), Payment Rails (USDFC), PDP (Proof of Data Possession).

## Creating a Client

```typescript
import { Synapse } from '@filoz/synapse-sdk'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount(`0x${privateKeyHex}`)
const synapse = Synapse.create({
  account,
  source: 'foc-demo-cli',  // required: identifies your app
})
// Uses DEFAULT_CHAIN (Filecoin Calibration) and default transport automatically
```

Authentication is wallet-based via **viem** (Ethereum/Filecoin wallet library).

## Uploading

```typescript
const result = await synapse.storage.upload(data, {
  onProgress: (bytes) => console.log(`${bytes} bytes uploaded`),
  onStored: (providerId, pieceCid) => console.log(`Stored: ${pieceCid}`),
})

console.log(result.pieceCid)    // PieceCID
console.log(result.size)        // number
console.log(result.copies)      // CopyResult[] with retrievalUrl per copy
```

`upload` accepts `Uint8Array | ReadableStream<Uint8Array>`. Handles provider selection, store, commit, and pull to secondaries internally.

### Context-based (finer control)

```typescript
const context = await synapse.storage.createContext({ withCDN: false })
const storeResult = await context.store(data, { onProgress })
await context.commit({ pieces: [{ pieceCid: storeResult.pieceCid }] })
```

## Downloading

```typescript
const data: Uint8Array = await synapse.storage.download({
  pieceCid: 'baga6ea4seaq...',
})
```

## BlobFetcher for Range Requests

The foc-encryption `BlobFetcher` interface:
```typescript
interface BlobFetcher {
  fetchEnvelope(): Promise<Uint8Array>
  fetchRange(offset: number, length: number): Promise<Uint8Array>
}
```

Constructing one from a piece retrieval URL:

```typescript
function createBlobFetcher(pieceUrl: string): BlobFetcher {
  return {
    async fetchEnvelope() {
      const resp = await fetch(pieceUrl, {
        headers: { Range: 'bytes=0-4095' },
      })
      return new Uint8Array(await resp.arrayBuffer())
    },
    async fetchRange(offset: number, length: number) {
      const resp = await fetch(pieceUrl, {
        headers: { Range: `bytes=${offset}-${offset + length - 1}` },
      })
      return new Uint8Array(await resp.arrayBuffer())
    },
  }
}
```

Piece URL can be obtained via:
```typescript
const context = await synapse.storage.createContext()
const url = context.getPieceUrl(pieceCid)
```

## CLI Example Patterns

The synapse-sdk repo includes a CLI example using `cleye`. Commands: `init`, `upload <path>`, `upload-dataset`, `datasets`, `pieces`, `fund`, `deposit`, `withdraw`, `session-keys`.

Upload pattern from their CLI:
```typescript
const { client } = privateKeyClient(chain)
const synapse = new Synapse({ client, source: 'synapse-example' })
const context = await synapse.storage.createContext({ withCDN, dataSetId })
const data = fileHandle.readableWebStream()
await context.upload(data, {
  pieceMetadata: { name },
  onStored, onPiecesAdded, onPiecesConfirmed,
})
```
