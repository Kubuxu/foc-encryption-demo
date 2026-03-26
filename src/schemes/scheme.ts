import type { AppMetadata } from '../types.js'

export interface DecryptMetadata {
  chunkSize?: number
  chunkCount?: number
}

export interface EncryptionScheme {
  readonly name: string
  readonly algorithmId: number
  readonly isSeekable: boolean

  encrypt(
    key: CryptoKey,
    plaintext: Uint8Array,
    protectedHeaders: Uint8Array,
    appMetadata?: AppMetadata
  ): Promise<EncryptResult>

  decrypt(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    protectedHeaders: Uint8Array,
    metadata?: DecryptMetadata
  ): Promise<Uint8Array>
}

export interface EncryptResult {
  ciphertext: Uint8Array
  iv: Uint8Array
  chunkSize?: number
  chunkCount?: number
}
