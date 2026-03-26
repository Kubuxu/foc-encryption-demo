import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { assembleBlob, parseBlob } from '../../src/blob.ts'

describe('assembleBlob', () => {
  it('concatenates envelope and ciphertext', () => {
    const envelope = new Uint8Array([1, 2, 3])
    const ciphertext = new Uint8Array([4, 5, 6])
    const blob = assembleBlob(envelope, ciphertext)

    expect(blob.length).toBe(6)
    expect(blob).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6]))
  })
})

describe('parseBlob', () => {
  it('splits blob into envelope and ciphertext using decodeFirst', () => {
    // Create a CBOR-encoded value followed by extra bytes
    const envelope = cborg.encode('hello')
    const ciphertext = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
    const blob = assembleBlob(envelope, ciphertext)

    const result = parseBlob(blob)
    expect(result.envelopeBytes.length).toBe(envelope.length)
    expect(result.ciphertext).toEqual(ciphertext)
  })
})
