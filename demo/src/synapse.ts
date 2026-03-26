import { Synapse } from '@filoz/synapse-sdk'
import type { BlobFetcher } from 'foc-encryption'

export interface SynapseConfig {
  privateKey: string
  source?: string
}

export async function createSynapseClient(config: SynapseConfig): Promise<Synapse> {
  const privateKey = config.privateKey.startsWith('0x') ? config.privateKey : `0x${config.privateKey}`
  return Synapse.create({ privateKey })
}

export function createBlobFetcher(url: string): BlobFetcher {
  return {
    async fetchEnvelope() {
      const resp = await fetch(url, { headers: { Range: 'bytes=0-4095' } })
      return new Uint8Array(await resp.arrayBuffer())
    },
    async fetchRange(offset: number, length: number) {
      const resp = await fetch(url, {
        headers: { Range: `bytes=${offset}-${offset + length - 1}` },
      })
      return new Uint8Array(await resp.arrayBuffer())
    },
  }
}
