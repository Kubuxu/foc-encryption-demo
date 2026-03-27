export type PieceLocator = { kind: 'pieceCid'; pieceCid: string } | { kind: 'url'; url: string }

export function parseLocator(input: string): PieceLocator {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return { kind: 'url', url: input }
  }
  return { kind: 'pieceCid', pieceCid: input }
}

export async function fetchBlob(locator: PieceLocator, synapse?: SynapseClient): Promise<Uint8Array> {
  if (locator.kind === 'url') {
    const resp = await fetch(locator.url)
    if (!resp.ok) {
      throw new Error(`Failed to fetch blob: HTTP ${resp.status} ${resp.statusText}`)
    }
    return new Uint8Array(await resp.arrayBuffer())
  }
  if (!synapse) {
    throw new Error('PRIVATE_KEY not set. Provide --private-key or set the environment variable.')
  }
  return synapse.storage.download({ pieceCid: locator.pieceCid })
}

// Minimal interface to avoid hard dependency on synapse-sdk types in this module
interface SynapseClient {
  storage: {
    download(options: { pieceCid: string }): Promise<Uint8Array>
  }
}
