import { describe, expect, it } from 'vitest'
import {
  COSE_HEADER_ALG,
  COSE_HEADER_IV,
  COSE_HEADER_TYP,
  CoseAlgorithm,
  CoseHeaderParam,
} from '../../../src/cose/headers.js'

describe('CoseAlgorithm', () => {
  it('has AES_256_GCM = 3', () => {
    expect(CoseAlgorithm.AES_256_GCM).toBe(3)
  })

  it('has CHUNKED_AES_256_GCM_STREAM = -65793', () => {
    expect(CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM).toBe(-65793)
  })
})

describe('CoseHeaderParam', () => {
  it('has CHUNK_SIZE = -65790', () => {
    expect(CoseHeaderParam.CHUNK_SIZE).toBe(-65790)
  })

  it('has CHUNK_COUNT = -65791', () => {
    expect(CoseHeaderParam.CHUNK_COUNT).toBe(-65791)
  })

  it('has APP_METADATA = -65792', () => {
    expect(CoseHeaderParam.APP_METADATA).toBe(-65792)
  })
})

describe('Standard COSE header labels', () => {
  it('alg label = 1', () => {
    expect(COSE_HEADER_ALG).toBe(1)
  })

  it('iv label = 5', () => {
    expect(COSE_HEADER_IV).toBe(5)
  })

  it('typ label = 16', () => {
    expect(COSE_HEADER_TYP).toBe(16)
  })
})
