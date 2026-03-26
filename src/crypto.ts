const c = globalThis.crypto

export function getRandomValues(length: number): Uint8Array {
  const buf = new Uint8Array(length)
  c.getRandomValues(buf)
  return buf
}

export async function aesGcmEncrypt(
  key: CryptoKey,
  iv: Uint8Array,
  plaintext: Uint8Array,
  additionalData: Uint8Array
): Promise<Uint8Array> {
  const result = await c.subtle.encrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, plaintext)
  return new Uint8Array(result)
}

export async function aesGcmDecrypt(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  additionalData: Uint8Array
): Promise<Uint8Array> {
  const result = await c.subtle.decrypt({ name: 'AES-GCM', iv, additionalData, tagLength: 128 }, key, ciphertext)
  return new Uint8Array(result)
}

export async function importAesGcmKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return c.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt'])
}
