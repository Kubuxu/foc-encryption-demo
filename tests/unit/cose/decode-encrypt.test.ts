import { describe, expect, it } from 'vitest'
import { decodeCoseEnvelope } from '../../../src/cose/decode.js'
import { encodeCoseEncrypt } from '../../../src/cose/encode.js'
import { CoseAlgorithm } from '../../../src/cose/headers.js'
import type { Recipient } from '../../../src/types.js'

describe('decodeCoseEnvelope with tag 96', () => {
  const recipients: Recipient[] = [
    {
      algorithm: -3,
      keyId: new TextEncoder().encode('alice'),
      wrappedKey: new Uint8Array([1, 2, 3, 4]),
    },
    {
      algorithm: -3,
      keyId: new TextEncoder().encode('bob'),
      wrappedKey: new Uint8Array([5, 6, 7, 8]),
    },
  ]

  it('parses tag 96 envelope', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)

    const result = decodeCoseEnvelope(encoded)

    expect(result.tag).toBe(96)
    expect(result.algorithm).toBe(3)
    expect(new Uint8Array(result.iv)).toEqual(iv)
  })

  it('extracts recipients array with alg/kid/wrappedKey', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)

    const result = decodeCoseEnvelope(encoded)

    expect(result.recipients).toHaveLength(2)
    const r0 = result.recipients[0]
    expect(r0.algorithm).toBe(-3)
    expect(r0.keyId).toBeDefined()
    expect(new Uint8Array(r0.keyId as Uint8Array)).toEqual(new TextEncoder().encode('alice'))
    expect(r0.wrappedKey).toBeDefined()
    expect(new Uint8Array(r0.wrappedKey as Uint8Array)).toEqual(new Uint8Array([1, 2, 3, 4]))

    const r1 = result.recipients[1]
    expect(r1.algorithm).toBe(-3)
    expect(r1.keyId).toBeDefined()
    expect(new Uint8Array(r1.keyId as Uint8Array)).toEqual(new TextEncoder().encode('bob'))
    expect(r1.wrappedKey).toBeDefined()
    expect(new Uint8Array(r1.wrappedKey as Uint8Array)).toEqual(new Uint8Array([5, 6, 7, 8]))
  })
})
