import { readFile, writeFile } from 'node:fs/promises'
import { decrypt, parseEnvelope } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { formatSize } from '../util.js'

export interface DecryptFlags {
  file: string
  key?: string
  password?: string
  output?: string
}

export async function decryptFile(flags: DecryptFlags): Promise<void> {
  const outputPath = flags.output ?? `${flags.file.replace(/\.enc$/, '')}.dec`

  const blob = new Uint8Array(await readFile(flags.file))
  const meta = parseEnvelope(blob)

  const keySource = parseKeySource({ key: flags.key, password: flags.password })
  const pbkdf2Salt =
    meta.appMetadata?.pbkdf2_salt instanceof Uint8Array ? meta.appMetadata.pbkdf2_salt : undefined
  const derived = await deriveKey(keySource, pbkdf2Salt)

  const plaintext = await decrypt(blob, derived.cek)

  await writeFile(outputPath, plaintext)

  console.log(`Plaintext size: ${formatSize(plaintext.length)}`)
  console.log(`Output:         ${outputPath}`)
}
