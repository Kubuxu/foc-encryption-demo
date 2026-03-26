import { readFile } from 'node:fs/promises'
import { encrypt, CoseAlgorithm, parseEnvelope } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { autoSelectAlgorithm, formatSize } from '../util.js'
import { createSynapseClient } from '../synapse.js'

export interface UploadFlags {
  file: string
  key?: string
  password?: string
  privateKey?: string
}

export async function uploadFile(flags: UploadFlags): Promise<void> {
  const privateKey = flags.privateKey ?? process.env.FOC_PRIVATE_KEY
  if (!privateKey) {
    throw new Error(
      'FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.'
    )
  }

  const plaintext = new Uint8Array(await readFile(flags.file))
  const keySource = parseKeySource({ key: flags.key, password: flags.password })
  const derived = await deriveKey(keySource)

  const algOptions = autoSelectAlgorithm(plaintext.length)
  const isChunked = algOptions.algorithm === CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM

  const appMetadata: Record<string, Uint8Array | string | number | boolean | undefined> = {}
  if (derived.salt) {
    appMetadata.pbkdf2_salt = derived.salt
    appMetadata.pbkdf2_iterations = 600_000
    appMetadata.pbkdf2_hash = 'SHA-256'
  }

  const hasMetadata = Object.keys(appMetadata).length > 0

  const blob = await encrypt(plaintext, derived.cek, {
    ...algOptions,
    appMetadata: hasMetadata ? appMetadata : undefined,
  })

  const synapse = createSynapseClient({ privateKey })
  const result = await synapse.storage.upload(blob, {
    callbacks: {
      onProgress: (bytes) => process.stderr.write(`\rUploading... ${formatSize(bytes)}`),
    },
  })
  process.stderr.write('\r\x1b[K')

  const algorithmName = isChunked ? 'Chunked-AES-256-GCM-STREAM' : 'AES-256-GCM'
  console.log(`PieceCID:       ${result.pieceCid.toString()}`)
  if (result.copies.length > 0) {
    console.log(`Retrieval URL:  ${result.copies[0].retrievalUrl}`)
  }
  console.log(`Algorithm:      ${algorithmName}`)
  console.log(`Plaintext size: ${formatSize(plaintext.length)}`)
  console.log(`Blob size:      ${formatSize(blob.length)}`)
  if (isChunked) {
    const meta = parseEnvelope(blob)
    if (meta.chunkCount !== undefined) {
      console.log(`Chunk count:    ${meta.chunkCount}`)
    }
  }
}
