import { InvalidKeyError } from './errors.ts'
import { importAesGcmKey } from './crypto.ts'

export function validateCek(cek: Uint8Array): void {
  if (cek.length !== 32) {
    throw new InvalidKeyError(`CEK must be exactly 32 bytes, got ${cek.length}`)
  }
  if (cek.every((b) => b === 0)) {
    throw new InvalidKeyError('CEK must not be all zeros')
  }
}

export async function importAndZeroCek(cek: Uint8Array): Promise<CryptoKey> {
  validateCek(cek)
  const key = await importAesGcmKey(cek)
  zeroBuffer(cek)
  return key
}

export function zeroBuffer(buf: Uint8Array): void {
  buf.fill(0)
}
