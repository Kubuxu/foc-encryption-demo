import { Synapse } from '@filoz/synapse-sdk'
import { http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import type { BlobFetcher } from 'foc-encryption'

const RPC_URL = process.env.RPC_URL || 'https://api.calibration.node.glif.io/rpc/v1'

export interface SynapseConfig {
  privateKey: string
  source?: string
}

export function createSynapseClient(config: SynapseConfig): Synapse {
  const privateKey = config.privateKey.startsWith('0x')
    ? (config.privateKey as `0x${string}`)
    : (`0x${config.privateKey}` as `0x${string}`)
  const account = privateKeyToAccount(privateKey)
  return Synapse.create({
    account,
    transport: http(RPC_URL),
    source: config.source ?? 'foc-demo',
  })
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
