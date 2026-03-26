import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { buildEncStructure } from '../../../src/cose/structures.js'

describe('buildEncStructure (AAD)', () => {
  it('builds Encrypt0 context string per RFC 9052 Section 5.3', () => {
    const protectedHeaders = cborg.encode(new Map([[1, 3]]))
    const aad = buildEncStructure('Encrypt0', protectedHeaders, new Uint8Array(0))

    // Enc_structure = ["Encrypt0", protected, external_aad]
    const decoded = cborg.decode(aad) as [string, Uint8Array, Uint8Array]
    expect(decoded[0]).toBe('Encrypt0')
    expect(new Uint8Array(decoded[1])).toEqual(protectedHeaders)
    expect(new Uint8Array(decoded[2])).toEqual(new Uint8Array(0))
  })

  it('builds Encrypt context string per RFC 9052 Section 5.3', () => {
    const protectedHeaders = cborg.encode(new Map([[1, 3]]))
    const aad = buildEncStructure('Encrypt', protectedHeaders, new Uint8Array(0))

    const decoded = cborg.decode(aad) as [string, Uint8Array, Uint8Array]
    expect(decoded[0]).toBe('Encrypt')
    expect(new Uint8Array(decoded[1])).toEqual(protectedHeaders)
    expect(new Uint8Array(decoded[2])).toEqual(new Uint8Array(0))
  })

  it('includes external AAD when provided', () => {
    const protectedHeaders = cborg.encode(new Map([[1, 3]]))
    const externalAad = new Uint8Array([0xde, 0xad])
    const aad = buildEncStructure('Encrypt0', protectedHeaders, externalAad)

    const decoded = cborg.decode(aad) as [string, Uint8Array, Uint8Array]
    expect(new Uint8Array(decoded[2])).toEqual(externalAad)
  })
})
