import { buildEncStructure } from '../cose/structures.js'
import { aesGcmDecrypt, aesGcmEncrypt, getRandomValues } from '../crypto.js'
import { AuthenticationError } from '../errors.js'
import type { DecryptMetadata, EncStructureContext, EncryptResult, EncryptionScheme } from './scheme.js'

const AES_GCM_IV_LENGTH = 12
const AES_GCM_TAG_LENGTH = 16

export class Aes256Gcm implements EncryptionScheme {
  readonly name = 'AES-256-GCM'
  readonly algorithmId = 3
  readonly isSeekable = false

  async encrypt(
    key: CryptoKey,
    plaintext: Uint8Array,
    protectedHeaders: Uint8Array,
    context: EncStructureContext
  ): Promise<EncryptResult> {
    const iv = getRandomValues(AES_GCM_IV_LENGTH)
    const aad = buildEncStructure(context, protectedHeaders, new Uint8Array(0))
    const ciphertext = await aesGcmEncrypt(key, iv, plaintext, aad)
    return { ciphertext, iv }
  }

  async decrypt(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    protectedHeaders: Uint8Array,
    context: EncStructureContext,
    _metadata?: DecryptMetadata
  ): Promise<Uint8Array> {
    const aad = buildEncStructure(context, protectedHeaders, new Uint8Array(0))
    try {
      return await aesGcmDecrypt(key, iv, ciphertext, aad)
    } catch {
      throw new AuthenticationError('AEAD authentication failed — wrong key or tampered ciphertext')
    }
  }
}

export { AES_GCM_IV_LENGTH, AES_GCM_TAG_LENGTH }
