import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { decodeCoseEnvelope } from '../../../src/cose/decode.js'
import { encodeCoseEncrypt0, getProtectedHeaderBytes } from '../../../src/cose/encode.js'
import {
  COSE_HEADER_ALG,
  COSE_HEADER_IV,
  CoseAlgorithm,
  CoseHeaderParam,
  FOC_ENVELOPE_TYPE,
} from '../../../src/cose/headers.js'
import { COSE_TAG_ENCRYPT0 } from '../../../src/cose/tags.js'
import { MalformedEnvelopeError } from '../../../src/errors.js'

describe('decodeCoseEnvelope', () => {
  it('parses COSE_Encrypt0 (tag 16) envelope', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(getProtectedHeaderBytes(CoseAlgorithm.AES_256_GCM), iv)

    const result = decodeCoseEnvelope(encoded)

    expect(result.tag).toBe(16)
    expect(result.algorithm).toBe(3)
    expect(new Uint8Array(result.iv)).toEqual(iv)
    expect(result.recipients).toHaveLength(0)
  })

  it('extracts protected headers (alg, typ)', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(getProtectedHeaderBytes(CoseAlgorithm.AES_256_GCM), iv)

    const result = decodeCoseEnvelope(encoded)

    expect(result.algorithm).toBe(3)
    expect(result.protectedHeaders).toBeInstanceOf(Uint8Array)
  })

  it('extracts iv from unprotected headers', () => {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const encoded = encodeCoseEncrypt0(getProtectedHeaderBytes(CoseAlgorithm.AES_256_GCM), iv)

    const result = decodeCoseEnvelope(encoded)

    expect(new Uint8Array(result.iv)).toEqual(iv)
  })

  it('extracts chunk size and count from protected headers', () => {
    const iv = new Uint8Array(7).fill(0xab)
    const protectedBytes = getProtectedHeaderBytes(CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM, {
      chunkSize: 4096,
      chunkCount: 3,
    })

    const result = decodeCoseEnvelope(encodeCoseEncrypt0(protectedBytes, iv))

    expect(result.chunkSize).toBe(4096)
    expect(result.chunkCount).toBe(3)
  })

  it('rejects chunk size or count in unprotected headers', () => {
    for (const label of [CoseHeaderParam.CHUNK_SIZE, CoseHeaderParam.CHUNK_COUNT]) {
      const protectedBytes = getProtectedHeaderBytes(CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM)
      const unprotectedMap = new Map<number, unknown>([
        [COSE_HEADER_IV, new Uint8Array(7)],
        [label, 4096],
      ])
      const encoded = cborg.encode(new cborg.Tagged(COSE_TAG_ENCRYPT0, [protectedBytes, unprotectedMap, null]))

      expect(() => decodeCoseEnvelope(encoded)).toThrow(MalformedEnvelopeError)
    }
  })

  it('rejects a non-integer protected chunk size', () => {
    const protectedBytes = cborg.encode(
      new Map<number, unknown>([
        [COSE_HEADER_ALG, CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM],
        [CoseHeaderParam.CHUNK_SIZE, 'big'],
      ])
    )
    const unprotectedMap = new Map<number, unknown>([[COSE_HEADER_IV, new Uint8Array(7)]])
    const encoded = cborg.encode(new cborg.Tagged(COSE_TAG_ENCRYPT0, [protectedBytes, unprotectedMap, null]))

    expect(() => decodeCoseEnvelope(encoded)).toThrow(MalformedEnvelopeError)
  })
})
