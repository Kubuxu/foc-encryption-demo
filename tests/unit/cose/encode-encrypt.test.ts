import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { encodeCoseEncrypt } from '../../../src/cose/encode.js'
import { COSE_HEADER_ALG, COSE_HEADER_KID, CoseAlgorithm } from '../../../src/cose/headers.js'
import { coseDecodeOptions } from '../../../src/cose/tags.js'
import type { Recipient } from '../../../src/types.js'

const decodeOpts = coseDecodeOptions

describe('encodeCoseEncrypt (tag 96)', () => {
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

  it('produces CBOR tag 96', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)
    const decoded = cborg.decode(encoded, decodeOpts)

    expect(decoded.tag).toBe(96)
  })

  it('contains 4-element array [protected, unprotected, null, recipients]', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as unknown[]

    expect(arr).toHaveLength(4)
    expect(arr[2]).toBeNull()
  })

  it('encodes each recipient as [protected, unprotected, ciphertext]', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as unknown[]
    const recipientArr = arr[3] as unknown[][]

    expect(recipientArr).toHaveLength(2)

    for (const r of recipientArr) {
      expect(r).toHaveLength(3)
      // protected is bstr, unprotected is map, ciphertext is bstr
      expect(r[0]).toBeInstanceOf(Uint8Array)
      expect(r[1]).toBeInstanceOf(Map)
      expect(r[2]).toBeInstanceOf(Uint8Array)
    }
  })

  it('recipient protected headers contain alg', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as unknown[]
    const recipientArr = arr[3] as unknown[][]

    const rProtected = cborg.decode(recipientArr[0][0] as Uint8Array, { useMaps: true }) as Map<number, unknown>
    expect(rProtected.get(COSE_HEADER_ALG)).toBe(-3)
  })

  it('recipient unprotected headers contain kid', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt(CoseAlgorithm.AES_256_GCM, iv, recipients)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as unknown[]
    const recipientArr = arr[3] as unknown[][]

    const rUnprotected = recipientArr[0][1] as Map<number, unknown>
    expect(new Uint8Array(rUnprotected.get(COSE_HEADER_KID) as Uint8Array)).toEqual(new TextEncoder().encode('alice'))
  })
})
