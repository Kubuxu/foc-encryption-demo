import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { COSE_HEADER_ALG } from '../../../src/cose/headers.js'
import { importAesGcmKey } from '../../../src/crypto.js'
import { AuthenticationError } from '../../../src/errors.js'
import { ChunkedAes256GcmStream, MAX_CHUNK_INDEX, deriveChunkNonce } from '../../../src/schemes/chunked-aes-256-gcm.js'

describe('ChunkedAes256GcmStream scheme', () => {
  it('has correct algorithm properties', () => {
    const scheme = new ChunkedAes256GcmStream()
    expect(scheme.name).toBe('Chunked-AES-256-GCM-STREAM')
    expect(scheme.algorithmId).toBe(-65793)
    expect(scheme.isSeekable).toBe(true)
  })

  it('encrypts multi-chunk data and reports correct chunk count', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 16 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array(50) // 16 + 16 + 18 = 3 chunks at chunkSize=16... wait 50/16 = 4 chunks
    plaintext.fill(0x42)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders)

    expect(result.chunkCount).toBe(4) // ceil(50/16) = 4
    expect(result.chunkSize).toBe(16)
    expect(result.iv.length).toBe(7)
    // Each chunk is chunkSize + 16 tag, except last which is (50 - 48) + 16 = 18
    expect(result.ciphertext.length).toBe(3 * (16 + 16) + (2 + 16))
  })

  it('generates 7-byte base nonce (IV)', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 32 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array(64)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders)

    expect(result.iv.length).toBe(7)
  })

  it('full decrypt round-trip', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 16 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array(50)
    plaintext.fill(0x42)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders)
    const decrypted = await scheme.decrypt(key, result.ciphertext, result.iv, protectedHeaders, {
      chunkSize: result.chunkSize,
      chunkCount: result.chunkCount,
    })

    expect(decrypted).toEqual(plaintext)
  })

  it('wrong key throws AuthenticationError on decrypt', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 16 })
    const rawKey1 = crypto.getRandomValues(new Uint8Array(32))
    const rawKey2 = crypto.getRandomValues(new Uint8Array(32))
    const key1 = await importAesGcmKey(rawKey1)
    const key2 = await importAesGcmKey(rawKey2)
    const plaintext = new Uint8Array(32).fill(0x42)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key1, plaintext, protectedHeaders)
    await expect(
      scheme.decrypt(key2, result.ciphertext, result.iv, protectedHeaders, {
        chunkSize: result.chunkSize,
        chunkCount: result.chunkCount,
      })
    ).rejects.toThrow(AuthenticationError)
  })
})

describe('deriveChunkNonce', () => {
  it('produces 12-byte nonce with base_nonce + counter + last_flag', () => {
    const baseNonce = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07])
    const nonce = deriveChunkNonce(baseNonce, 0, false)

    expect(nonce.length).toBe(12)
    expect(nonce.slice(0, 7)).toEqual(baseNonce)
    expect(nonce.slice(7, 11)).toEqual(new Uint8Array([0, 0, 0, 0]))
    expect(nonce[11]).toBe(0x00)
  })

  it('sets last_flag to 0x01 for final chunk', () => {
    const baseNonce = new Uint8Array(7).fill(0xab)
    const nonce = deriveChunkNonce(baseNonce, 5, true)

    expect(nonce[7]).toBe(0)
    expect(nonce[8]).toBe(0)
    expect(nonce[9]).toBe(0)
    expect(nonce[10]).toBe(5)
    expect(nonce[11]).toBe(0x01)
  })

  it('encodes chunk index as big-endian', () => {
    const baseNonce = new Uint8Array(7).fill(0)
    const nonce = deriveChunkNonce(baseNonce, 0x01020304, false)

    expect(nonce[7]).toBe(0x01)
    expect(nonce[8]).toBe(0x02)
    expect(nonce[9]).toBe(0x03)
    expect(nonce[10]).toBe(0x04)
  })
})

describe('ChunkedAes256GcmStream edge cases', () => {
  it('single-chunk file (smaller than chunk_size)', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 256 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array(10).fill(0x42)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders)
    expect(result.chunkCount).toBe(1)

    const decrypted = await scheme.decrypt(key, result.ciphertext, result.iv, protectedHeaders, {
      chunkSize: result.chunkSize,
      chunkCount: result.chunkCount,
    })
    expect(decrypted).toEqual(plaintext)
  })

  it('chunk_size=1 (degenerate)', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 1 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array([0xaa, 0xbb, 0xcc])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders)
    expect(result.chunkCount).toBe(3)
    // Each chunk is 1 byte plaintext + 16 byte tag = 17 bytes
    expect(result.ciphertext.length).toBe(3 * 17)

    const decrypted = await scheme.decrypt(key, result.ciphertext, result.iv, protectedHeaders, {
      chunkSize: result.chunkSize,
      chunkCount: result.chunkCount,
    })
    expect(decrypted).toEqual(plaintext)
  })

  it('decrypt rejects chunkCount exceeding 4-byte counter max', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 16 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    await expect(
      scheme.decrypt(key, new Uint8Array(0), new Uint8Array(7), protectedHeaders, {
        chunkSize: 16,
        chunkCount: MAX_CHUNK_INDEX + 2,
      })
    ).rejects.toThrow(/exceeds the 4-byte counter maximum/)
  })

  it('decryptRange rejects chunkCount exceeding 4-byte counter max', async () => {
    const scheme = new ChunkedAes256GcmStream({ chunkSize: 16 })
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, -65793]]))

    await expect(
      scheme.decryptRange(key, new Uint8Array(0), new Uint8Array(7), protectedHeaders, 0, 1, 16, MAX_CHUNK_INDEX + 2)
    ).rejects.toThrow(/exceeds the 4-byte counter maximum/)
  })
})
