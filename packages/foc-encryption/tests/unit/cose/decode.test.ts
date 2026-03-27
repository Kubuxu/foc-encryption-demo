import { describe, expect, it } from 'vitest'
import { decodeCoseEnvelope } from '../../../src/cose/decode.js'
import { encodeCoseEncrypt0 } from '../../../src/cose/encode.js'
import { COSE_HEADER_IV, CoseAlgorithm, FOC_ENVELOPE_TYPE } from '../../../src/cose/headers.js'

describe('decodeCoseEnvelope', () => {
  it('parses COSE_Encrypt0 (tag 16) envelope', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)

    const result = decodeCoseEnvelope(encoded)

    expect(result.tag).toBe(16)
    expect(result.algorithm).toBe(3)
    expect(new Uint8Array(result.iv)).toEqual(iv)
    expect(result.recipients).toHaveLength(0)
  })

  it('extracts protected headers (alg, typ)', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)

    const result = decodeCoseEnvelope(encoded)

    expect(result.algorithm).toBe(3)
    expect(result.protectedHeaders).toBeInstanceOf(Uint8Array)
  })

  it('extracts iv from unprotected headers', () => {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)

    const result = decodeCoseEnvelope(encoded)

    expect(new Uint8Array(result.iv)).toEqual(iv)
  })
})
