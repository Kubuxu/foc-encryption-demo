import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { COSE_HEADER_ALG } from '../../../src/cose/headers.js'
import { importAesGcmKey } from '../../../src/crypto.js'
import { AuthenticationError } from '../../../src/errors.js'
import { Aes256Gcm } from '../../../src/schemes/aes-256-gcm.js'

describe('Aes256Gcm scheme', () => {
  const scheme = new Aes256Gcm()

  it('has correct algorithm properties', () => {
    expect(scheme.name).toBe('AES-256-GCM')
    expect(scheme.algorithmId).toBe(3)
    expect(scheme.isSeekable).toBe(false)
  })

  it('encrypt produces ciphertext of length plaintext + 16 (tag)', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array([1, 2, 3, 4, 5])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')

    expect(result.ciphertext.length).toBe(plaintext.length + 16)
    expect(result.iv.length).toBe(12)
  })

  it('generates unique IV per call', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array([1, 2, 3])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const r1 = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')
    const r2 = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')

    expect(r1.iv).not.toEqual(r2.iv)
  })

  it('ciphertext differs from plaintext', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array(32).fill(0x42)
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')
    const ciphertextPrefix = result.ciphertext.slice(0, plaintext.length)

    expect(ciphertextPrefix).not.toEqual(plaintext)
  })

  it('decrypt recovers plaintext from known ciphertext', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array([10, 20, 30, 40, 50])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')
    const decrypted = await scheme.decrypt(key, result.ciphertext, result.iv, protectedHeaders, 'Encrypt0')

    expect(decrypted).toEqual(plaintext)
  })

  it('decrypt with wrong key throws AuthenticationError', async () => {
    const rawKey1 = crypto.getRandomValues(new Uint8Array(32))
    const rawKey2 = crypto.getRandomValues(new Uint8Array(32))
    const key1 = await importAesGcmKey(rawKey1)
    const key2 = await importAesGcmKey(rawKey2)
    const plaintext = new Uint8Array([1, 2, 3])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const result = await scheme.encrypt(key1, plaintext, protectedHeaders, 'Encrypt0')
    await expect(scheme.decrypt(key2, result.ciphertext, result.iv, protectedHeaders, 'Encrypt0')).rejects.toThrow(
      AuthenticationError
    )
  })

  it('decrypt tampered ciphertext throws AuthenticationError', async () => {
    const rawKey = crypto.getRandomValues(new Uint8Array(32))
    const key = await importAesGcmKey(rawKey)
    const plaintext = new Uint8Array([1, 2, 3])
    const protectedHeaders = cborg.encode(new Map([[COSE_HEADER_ALG, 3]]))

    const result = await scheme.encrypt(key, plaintext, protectedHeaders, 'Encrypt0')
    // Flip a byte in ciphertext
    result.ciphertext[0] ^= 0xff
    await expect(scheme.decrypt(key, result.ciphertext, result.iv, protectedHeaders, 'Encrypt0')).rejects.toThrow(
      AuthenticationError
    )
  })
})
