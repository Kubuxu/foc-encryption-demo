export type PieceLocator = { kind: 'pieceCid'; pieceCid: string } | { kind: 'url'; url: string }

export function parseLocator(input: string): PieceLocator {
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return { kind: 'url', url: input }
  }
  return { kind: 'pieceCid', pieceCid: input }
}

export async function resolveUrl(locator: PieceLocator, synapse?: SynapseClient): Promise<string> {
  if (locator.kind === 'url') {
    return locator.url
  }
  if (!synapse) {
    throw new Error('FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.')
  }
  const context = await synapse.storage.createContext()
  return context.getPieceUrl(locator.pieceCid)
}

// Minimal interface to avoid hard dependency on synapse-sdk types in this module
interface SynapseClient {
  storage: {
    createContext(): Promise<{ getPieceUrl(pieceCid: string): string }>
  }
}
