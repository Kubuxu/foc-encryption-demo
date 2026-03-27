import { writeFile } from 'node:fs/promises'
import { decrypt, parseEnvelope } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { parseLocator, fetchBlob } from '../locator.js'
import { createSynapseClient } from '../synapse.js'
import { formatSize } from '../util.js'

export interface DownloadFlags {
  locator: string
  key?: string
  password?: string
  output: string
  privateKey?: string
}

export async function downloadFile(flags: DownloadFlags): Promise<void> {
  const locator = parseLocator(flags.locator)

  let synapse: ReturnType<typeof createSynapseClient> | undefined
  if (locator.kind === 'pieceCid') {
    const privateKey = flags.privateKey ?? process.env.PRIVATE_KEY
    if (!privateKey) {
      throw new Error(
        'PRIVATE_KEY not set. Provide --private-key or set the environment variable.'
      )
    }
    synapse = createSynapseClient({ privateKey })
  }

  const blob = await fetchBlob(locator, synapse)

  const meta = parseEnvelope(blob)
  const keySource = parseKeySource({ key: flags.key, password: flags.password })
  const pbkdf2Salt =
    meta.appMetadata?.pbkdf2_salt instanceof Uint8Array ? meta.appMetadata.pbkdf2_salt : undefined
  const derived = await deriveKey(keySource, pbkdf2Salt)

  const plaintext = await decrypt(blob, derived.cek)

  await writeFile(flags.output, plaintext)

  console.log(`Plaintext size: ${formatSize(plaintext.length)}`)
  console.log(`Output:         ${flags.output}`)
}
