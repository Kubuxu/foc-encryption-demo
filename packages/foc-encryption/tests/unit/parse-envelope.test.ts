import { describe, expect, it } from 'vitest'
import { CoseAlgorithm } from '../../src/cose/headers.js'
import { encrypt } from '../../src/envelope.js'
import { parseEnvelope } from '../../src/envelope.js'
import { MalformedEnvelopeError } from '../../src/errors.js'
import type { Recipient } from '../../src/types.js'

describe('parseEnvelope', () => {
  it('parses simple envelope metadata (alg, iv, seekable=false, envelopeSize)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('test')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const metadata = parseEnvelope(blob)

    expect(metadata.algorithm).toBe(3)
    expect(metadata.seekable).toBe(false)
    expect(metadata.iv.length).toBe(12)
    expect(metadata.envelopeSize).toBeGreaterThan(0)
    expect(metadata.recipients).toHaveLength(0)
    expect(metadata.chunkSize).toBeUndefined()
    expect(metadata.chunkCount).toBeUndefined()
  })

  it('parses chunked envelope metadata (chunkSize, chunkCount, seekable=true)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(200).fill(0x42)

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const metadata = parseEnvelope(blob)

    expect(metadata.algorithm).toBe(-65793)
    expect(metadata.seekable).toBe(true)
    expect(metadata.iv.length).toBe(7)
    expect(metadata.chunkSize).toBe(64)
    expect(metadata.chunkCount).toBe(4)
    expect(metadata.recipients).toHaveLength(0)
  })

  it('parses app_metadata with CID', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const cid = new Uint8Array([0x01, 0x71, 0x12, 0x20, 0xab, 0xcd])
    const plaintext = new TextEncoder().encode('test')

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.AES_256_GCM,
      appMetadata: { cid },
    })
    const metadata = parseEnvelope(blob)

    expect(metadata.appMetadata).toBeDefined()
    expect(new Uint8Array(metadata.appMetadata?.cid as Uint8Array)).toEqual(cid)
  })

  it('parses multi-recipient envelope (recipients array)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('test')
    const recipients: Recipient[] = [
      { algorithm: -3, keyId: new TextEncoder().encode('alice'), wrappedKey: new Uint8Array([1, 2]) },
      { algorithm: -3, keyId: new TextEncoder().encode('bob'), wrappedKey: new Uint8Array([3, 4]) },
    ]

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)
    const metadata = parseEnvelope(blob)

    expect(metadata.recipients).toHaveLength(2)
    expect(metadata.recipients[0].algorithm).toBe(-3)
    expect(metadata.recipients[1].algorithm).toBe(-3)
  })

  it('malformed blob throws MalformedEnvelopeError', () => {
    const garbage = new Uint8Array([0xff, 0xfe, 0xfd])
    expect(() => parseEnvelope(garbage)).toThrow(MalformedEnvelopeError)
  })

  it('truncated blob throws MalformedEnvelopeError', () => {
    const truncated = new Uint8Array([0xd0]) // start of tag 16 but incomplete
    expect(() => parseEnvelope(truncated)).toThrow(MalformedEnvelopeError)
  })
})
