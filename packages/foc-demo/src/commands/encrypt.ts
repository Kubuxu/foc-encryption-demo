import { readFile, writeFile } from 'node:fs/promises'
import { encrypt, CoseAlgorithm } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { autoSelectAlgorithm, formatSize } from '../util.js'

export interface EncryptFlags {
  file: string
  key?: string
  password?: string
  output?: string
}

export async function encryptFile(flags: EncryptFlags): Promise<void> {
  const outputPath = flags.output ?? `${flags.file}.enc`

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

  await writeFile(outputPath, blob)

  const algorithmName = isChunked ? 'Chunked-AES-256-GCM-STREAM' : 'AES-256-GCM'
  console.log(`Algorithm:      ${algorithmName}`)
  console.log(`Plaintext size: ${formatSize(plaintext.length)}`)
  console.log(`Blob size:      ${formatSize(blob.length)}`)
  if (isChunked) {
    const { parseEnvelope } = await import('foc-encryption')
    const meta = parseEnvelope(blob)
    if (meta.chunkCount !== undefined) {
      console.log(`Chunk count:    ${meta.chunkCount}`)
    }
  }
  console.log(`Output:         ${outputPath}`)
}
