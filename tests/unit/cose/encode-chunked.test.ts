import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { encodeCoseEncrypt0 } from '../../../src/cose/encode.js'
import { COSE_HEADER_ALG, CoseAlgorithm, CoseHeaderParam } from '../../../src/cose/headers.js'
import { coseDecodeOptions } from '../../../src/cose/tags.js'

describe('encodeCoseEncrypt0 with chunked scheme', () => {
  it('includes chunk_size and chunk_count in unprotected headers', () => {
    const iv = new Uint8Array(7).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM, iv, {
      chunkSize: 262144,
      chunkCount: 10,
    })
    const decoded = cborg.decode(encoded, coseDecodeOptions)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]

    const protectedMap = cborg.decode(arr[0], { useMaps: true }) as Map<number, unknown>
    expect(protectedMap.get(COSE_HEADER_ALG)).toBe(-65793)

    const unprotectedMap = arr[1] as Map<number, unknown>
    expect(unprotectedMap.get(CoseHeaderParam.CHUNK_SIZE)).toBe(262144)
    expect(unprotectedMap.get(CoseHeaderParam.CHUNK_COUNT)).toBe(10)
  })

  it('uses 7-byte IV for chunked scheme', () => {
    const iv = new Uint8Array(7).fill(0xab)
    const encoded = encodeCoseEncrypt0(CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM, iv, {
      chunkSize: 1024,
      chunkCount: 5,
    })
    const decoded = cborg.decode(encoded, coseDecodeOptions)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]

    const unprotectedMap = arr[1] as Map<number, unknown>
    const decodedIv = unprotectedMap.get(5) as Uint8Array
    expect(decodedIv.length).toBe(7)
  })
})
