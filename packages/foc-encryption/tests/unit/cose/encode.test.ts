import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { encodeCoseEncrypt0 } from '../../../src/cose/encode.js'
import {
  COSE_HEADER_ALG,
  COSE_HEADER_IV,
  COSE_HEADER_TYP,
  CoseAlgorithm,
  FOC_ENVELOPE_TYPE,
} from '../../../src/cose/headers.js'
import { coseDecodeOptions } from '../../../src/cose/tags.js'

const decodeOpts = coseDecodeOptions

describe('encodeCoseEncrypt0', () => {
  it('produces CBOR-tagged structure with tag 16', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)
    const decoded = cborg.decode(encoded, decodeOpts)

    expect(decoded).toBeDefined()
    expect(decoded.tag).toBe(16)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]
    expect(arr).toHaveLength(3)
    expect(arr[2]).toBeNull()
  })

  it('encodes protected headers with alg and typ', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]

    const protectedMap = cborg.decode(arr[0], { useMaps: true }) as Map<number, unknown>
    expect(protectedMap.get(COSE_HEADER_ALG)).toBe(3)
    expect(protectedMap.get(COSE_HEADER_TYP)).toBe(FOC_ENVELOPE_TYPE)
  })

  it('encodes unprotected headers with iv', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv)
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]

    const unprotectedMap = arr[1] as Map<number, unknown>
    expect(new Uint8Array(unprotectedMap.get(COSE_HEADER_IV) as Uint8Array)).toEqual(iv)
  })

  it('includes app_metadata in unprotected headers when provided', () => {
    const iv = new Uint8Array(12).fill(0xab)
    const appMeta = { cid: new Uint8Array([1, 2, 3]) }
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.AES_256_GCM, iv, { appMetadata: appMeta })
    const decoded = cborg.decode(encoded, decodeOpts)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]
    const unprotectedMap = arr[1] as Map<number, unknown>

    const metadataMap = unprotectedMap.get(-65792) as Map<string, unknown>
    expect(metadataMap).toBeDefined()
    expect(new Uint8Array(metadataMap.get('cid') as Uint8Array)).toEqual(new Uint8Array([1, 2, 3]))
  })
})
