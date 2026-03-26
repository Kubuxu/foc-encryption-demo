import { writeFile } from 'node:fs/promises'
import { decrypt, parseEnvelope } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { parseLocator, resolveUrl } from '../locator.js'
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
    const privateKey = flags.privateKey ?? process.env.FOC_PRIVATE_KEY
    if (!privateKey) {
      throw new Error(
        'FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.'
      )
    }
    synapse = createSynapseClient({ privateKey })
  }

  const url = await resolveUrl(locator, synapse)

  const resp = await fetch(url)
  if (!resp.ok) {
    throw new Error(`Failed to fetch blob: HTTP ${resp.status} ${resp.statusText}`)
  }
  const blob = new Uint8Array(await resp.arrayBuffer())

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
