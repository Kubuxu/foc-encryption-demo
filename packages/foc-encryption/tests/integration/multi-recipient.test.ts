import { describe, expect, it } from 'vitest'
import { parseBlob } from '../../src/blob.js'
import { decodeCoseEnvelope } from '../../src/cose/decode.js'
import { CoseAlgorithm } from '../../src/cose/headers.js'
import { decrypt, encrypt } from '../../src/envelope.js'
import type { Recipient } from '../../src/types.js'

describe('multi-recipient encryption', () => {
  const recipients: Recipient[] = [
    {
      algorithm: -3,
      keyId: new TextEncoder().encode('alice'),
      wrappedKey: new Uint8Array([10, 20, 30, 40]),
    },
    {
      algorithm: -3,
      keyId: new TextEncoder().encode('bob'),
      wrappedKey: new Uint8Array([50, 60, 70, 80]),
    },
  ]

  it('encrypt with recipients produces tag 96 (COSE_Encrypt)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('shared secret')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)

    const parsed = parseBlob(blob)
    const envelope = decodeCoseEnvelope(parsed.envelopeBytes)

    expect(envelope.tag).toBe(96)
  })

  it('both recipient descriptors present in parsed envelope', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('shared secret')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)

    const parsed = parseBlob(blob)
    const envelope = decodeCoseEnvelope(parsed.envelopeBytes)

    expect(envelope.recipients).toHaveLength(2)
    const r0 = envelope.recipients[0]
    expect(r0.algorithm).toBe(-3)
    expect(r0.keyId).toBeDefined()
    expect(new Uint8Array(r0.keyId as Uint8Array)).toEqual(new TextEncoder().encode('alice'))
    const r1 = envelope.recipients[1]
    expect(r1.algorithm).toBe(-3)
    expect(r1.keyId).toBeDefined()
    expect(new Uint8Array(r1.keyId as Uint8Array)).toEqual(new TextEncoder().encode('bob'))
  })

  it('decrypt still works with recipients attached', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('shared secret')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })
})
