import { AuthenticationError, decrypt, parseEnvelope } from 'foc-encryption'

// Copy bytes into a fresh ArrayBuffer — satisfies SubtleCrypto's BufferSource type without casts.
function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(view.byteLength)
  new Uint8Array(buf).set(view)
  return buf
}

async function deriveKey(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(new TextEncoder().encode(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: toArrayBuffer(salt), iterations: 600_000, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return new Uint8Array(bits)
}

/**
 * Fetch an encrypted blob from the given URL, derive the CEK via PBKDF2 using
 * the salt stored in the envelope's appMetadata, then decrypt and return plaintext.
 */
export async function fetchAndDecrypt(url: string, password: string): Promise<Uint8Array> {
  let response: Response
  try {
    response = await fetch(url)
  } catch (e) {
    throw new Error('Could not fetch: network error')
  }
  if (!response.ok) {
    throw new Error(`Could not fetch: ${response.status} ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const blob = new Uint8Array(buffer)

  const envelope = parseEnvelope(blob)
  const pbkdf2Salt = envelope.appMetadata?.pbkdf2_salt
  if (!(pbkdf2Salt instanceof Uint8Array)) {
    throw new Error('Envelope missing PBKDF2 salt in appMetadata')
  }

  const cek = await deriveKey(password, pbkdf2Salt)

  try {
    return await decrypt(blob, cek)
  } catch (e) {
    if (e instanceof AuthenticationError) {
      throw new Error('Wrong password')
    }
    throw e
  }
}
