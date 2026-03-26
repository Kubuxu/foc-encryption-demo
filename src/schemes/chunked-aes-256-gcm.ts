import { buildEncStructure } from '../cose/structures.js'
import { aesGcmDecrypt, aesGcmEncrypt, getRandomValues } from '../crypto.js'
import { AuthenticationError, FocEncryptionError, MalformedEnvelopeError } from '../errors.js'
import type { DecryptMetadata, EncryptResult, EncryptionScheme } from './scheme.js'

const BASE_NONCE_LENGTH = 7
const AES_GCM_TAG_LENGTH = 16
const DEFAULT_CHUNK_SIZE = 262144 // 256 KiB
const MAX_CHUNK_INDEX = 0xffffffff // 4-byte counter max

export interface ChunkedEncryptParams {
  chunkSize?: number
}

export class ChunkedAes256GcmStream implements EncryptionScheme {
  readonly name = 'Chunked-AES-256-GCM-STREAM'
  readonly algorithmId = -65793
  readonly isSeekable = true

  private chunkSize: number

  constructor(params?: ChunkedEncryptParams) {
    this.chunkSize = params?.chunkSize ?? DEFAULT_CHUNK_SIZE
  }

  async encrypt(key: CryptoKey, plaintext: Uint8Array, protectedHeaders: Uint8Array): Promise<EncryptResult> {
    const baseNonce = getRandomValues(BASE_NONCE_LENGTH)
    const chunkCount = Math.max(1, Math.ceil(plaintext.length / this.chunkSize))
    if (chunkCount - 1 > MAX_CHUNK_INDEX) {
      throw new FocEncryptionError(
        `Plaintext too large: ${chunkCount} chunks exceeds the 4-byte counter maximum (${MAX_CHUNK_INDEX + 1})`
      )
    }

    const chunks: Uint8Array[] = []
    for (let i = 0; i < chunkCount; i++) {
      const isLast = i === chunkCount - 1
      const start = i * this.chunkSize
      const end = isLast ? plaintext.length : start + this.chunkSize
      const chunk = plaintext.subarray(start, end)

      const nonce = deriveChunkNonce(baseNonce, i, isLast)
      const aad = buildEncStructure('Encrypt0', protectedHeaders, new Uint8Array(0))
      const encrypted = await aesGcmEncrypt(key, nonce, chunk, aad)
      chunks.push(encrypted)
    }

    // Concatenate all chunk ciphertexts
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0)
    const ciphertext = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      ciphertext.set(chunk, offset)
      offset += chunk.length
    }

    return {
      ciphertext,
      iv: baseNonce,
      chunkSize: this.chunkSize,
      chunkCount,
    }
  }

  async decrypt(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    protectedHeaders: Uint8Array,
    metadata?: DecryptMetadata
  ): Promise<Uint8Array> {
    const effectiveChunkSize = metadata?.chunkSize ?? this.chunkSize
    const ciphertextChunkSize = effectiveChunkSize + AES_GCM_TAG_LENGTH
    const effectiveChunkCount = metadata?.chunkCount ?? Math.ceil(ciphertext.length / ciphertextChunkSize)
    if (effectiveChunkCount - 1 > MAX_CHUNK_INDEX) {
      throw new MalformedEnvelopeError(`Chunk count ${effectiveChunkCount} exceeds the 4-byte counter maximum`)
    }

    const plaintextChunks: Uint8Array[] = []
    for (let i = 0; i < effectiveChunkCount; i++) {
      const isLast = i === effectiveChunkCount - 1
      const start = i * ciphertextChunkSize
      const end = isLast ? ciphertext.length : start + ciphertextChunkSize
      const chunkCt = ciphertext.subarray(start, end)

      const nonce = deriveChunkNonce(iv, i, isLast)
      const aad = buildEncStructure('Encrypt0', protectedHeaders, new Uint8Array(0))
      try {
        const decrypted = await aesGcmDecrypt(key, nonce, chunkCt, aad)
        plaintextChunks.push(decrypted)
      } catch {
        throw new AuthenticationError(`AEAD authentication failed on chunk ${i}`)
      }
    }

    const totalLength = plaintextChunks.reduce((sum, c) => sum + c.length, 0)
    const plaintext = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of plaintextChunks) {
      plaintext.set(chunk, offset)
      offset += chunk.length
    }

    return plaintext
  }

  async decryptRange(
    key: CryptoKey,
    ciphertext: Uint8Array,
    iv: Uint8Array,
    protectedHeaders: Uint8Array,
    plaintextOffset: number,
    plaintextLength: number,
    chunkSize?: number,
    chunkCount?: number,
    chunkIndexOffset = 0
  ): Promise<Uint8Array> {
    const effectiveChunkSize = chunkSize ?? this.chunkSize
    const ciphertextChunkSize = effectiveChunkSize + AES_GCM_TAG_LENGTH
    const effectiveChunkCount = chunkCount ?? Math.ceil(ciphertext.length / ciphertextChunkSize)

    const firstChunk = Math.floor(plaintextOffset / effectiveChunkSize)
    if (effectiveChunkCount - 1 > MAX_CHUNK_INDEX) {
      throw new MalformedEnvelopeError(`Chunk count ${effectiveChunkCount} exceeds the 4-byte counter maximum`)
    }
    const lastChunk = Math.min(
      Math.floor((plaintextOffset + plaintextLength - 1) / effectiveChunkSize),
      effectiveChunkCount - 1
    )

    const plaintextChunks: Uint8Array[] = []
    for (let i = firstChunk; i <= lastChunk; i++) {
      const globalIndex = i + chunkIndexOffset
      const isLast = globalIndex === effectiveChunkCount - 1
      const ctStart = i * ciphertextChunkSize
      const ctEnd = isLast ? ciphertext.length : ctStart + ciphertextChunkSize
      const chunkCt = ciphertext.subarray(ctStart, ctEnd)

      const nonce = deriveChunkNonce(iv, globalIndex, isLast)
      const aad = buildEncStructure('Encrypt0', protectedHeaders, new Uint8Array(0))
      try {
        const decrypted = await aesGcmDecrypt(key, nonce, chunkCt, aad)
        plaintextChunks.push(decrypted)
      } catch {
        throw new AuthenticationError(`AEAD authentication failed on chunk ${i}`)
      }
    }

    // Concatenate decrypted chunks
    const totalLength = plaintextChunks.reduce((sum, c) => sum + c.length, 0)
    const combined = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of plaintextChunks) {
      combined.set(chunk, offset)
      offset += chunk.length
    }

    // Slice to the exact requested range within the decrypted chunk window
    const startInWindow = plaintextOffset - firstChunk * effectiveChunkSize
    return combined.slice(startInWindow, startInWindow + plaintextLength)
  }
}

/**
 * Derive per-chunk nonce:
 * nonce[0..6]  = base_nonce[0..6]
 * nonce[7..10] = chunk_index (4 bytes, big-endian)
 * nonce[11]    = last_flag (0x00 or 0x01)
 */
function deriveChunkNonce(baseNonce: Uint8Array, chunkIndex: number, isLast: boolean): Uint8Array {
  const nonce = new Uint8Array(12)
  nonce.set(baseNonce.subarray(0, BASE_NONCE_LENGTH), 0)
  // 4-byte big-endian chunk index at positions 7-10
  nonce[7] = (chunkIndex >>> 24) & 0xff
  nonce[8] = (chunkIndex >>> 16) & 0xff
  nonce[9] = (chunkIndex >>> 8) & 0xff
  nonce[10] = chunkIndex & 0xff
  // last flag at position 11
  nonce[11] = isLast ? 0x01 : 0x00
  return nonce
}

export { DEFAULT_CHUNK_SIZE, AES_GCM_TAG_LENGTH, BASE_NONCE_LENGTH, MAX_CHUNK_INDEX, deriveChunkNonce }
