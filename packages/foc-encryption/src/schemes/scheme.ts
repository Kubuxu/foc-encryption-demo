import type { AppMetadata } from '../types.js'

/**
 * The COSE Enc_structure context string (RFC 9052 Section 5.3): "Encrypt" for a
 * COSE_Encrypt (tag 96, has recipients) and "Encrypt0" for a COSE_Encrypt0
 * (tag 16, no recipients). The body AEAD must authenticate the context that
 * matches the envelope structure carrying it, so the caller (envelope.ts)
 * selects it from the presence of recipients rather than the scheme assuming one.
 */
export type EncStructureContext = 'Encrypt' | 'Encrypt0'

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
    context: EncStructureContext,
    appMetadata?: AppMetadata
  ): Promise<EncryptResult>

  decrypt(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    protectedHeaders: Uint8Array,
    context: EncStructureContext,
    metadata?: DecryptMetadata
  ): Promise<Uint8Array>
}

export interface EncryptResult {
  ciphertext: Uint8Array
  iv: Uint8Array
  chunkSize?: number
  chunkCount?: number
}
