export type KeySource = { kind: 'hex'; hex: string } | { kind: 'password'; password: string }

export interface DerivedKey {
  cek: Uint8Array
  salt?: Uint8Array
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length !== 64) {
    throw new Error(`Invalid key: expected 64 hex characters, got ${hex.length}`)
  }
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error('Invalid key: non-hex characters found')
  }
  const bytes = new Uint8Array(32)
  for (let i = 0; i < 32; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export { hexToBytes }

export async function deriveKey(source: KeySource, existingSalt?: Uint8Array): Promise<DerivedKey> {
  if (source.kind === 'hex') {
    return { cek: hexToBytes(source.hex) }
  }

  const saltSource = existingSalt ?? crypto.getRandomValues(new Uint8Array(16))
  const salt = new Uint8Array(saltSource)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(source.password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 600_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  )
  return { cek: new Uint8Array(bits), salt }
}
