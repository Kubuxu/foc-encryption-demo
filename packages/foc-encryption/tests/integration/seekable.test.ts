import { describe, expect, it } from 'vitest'
import { CoseAlgorithm } from '../../src/cose/headers.js'
import { decrypt, decryptRange, encrypt, parseEnvelope } from '../../src/envelope.js'
import { SchemeNotSeekableError } from '../../src/errors.js'
import type { BlobFetcher, Recipient } from '../../src/types.js'

/** Create a BlobFetcher backed by a full encrypted blob. */
function makeBlobFetcher(blob: Uint8Array): BlobFetcher {
  const meta = parseEnvelope(blob)
  return {
    async fetchEnvelope() {
      return blob.slice(0, meta.envelopeSize)
    },
    async fetchRange(offset: number, length: number) {
      return blob.slice(offset, offset + length)
    },
  }
}

describe('seekable encryption (chunked AES-256-GCM STREAM)', () => {
  it('full round-trip with chunked scheme', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(200)
    plaintext.fill(0x42)

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })

    const decrypted = await decrypt(blob, cek)
    expect(decrypted).toEqual(plaintext)
  })

  it('range decryption of middle chunk', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    // 256 bytes of sequential data, 64-byte chunks = 4 chunks
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })

    // Decrypt bytes 64-127 (second chunk)
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    const range = await decryptRange(fetcher, meta, cek, { offset: 64, length: 64 })
    expect(range).toEqual(plaintext.slice(64, 128))
  })

  it('range decryption with recipients uses the COSE_Encrypt context', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(128).fill(0x42)
    const recipients: Recipient[] = [{ algorithm: -3, wrappedKey: new Uint8Array([1, 2, 3]) }]
    const blob = await encrypt(
      plaintext,
      cek,
      { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM, chunkSize: 64 },
      recipients
    )

    const meta = parseEnvelope(blob)
    const range = await decryptRange(makeBlobFetcher(blob), meta, cek, { offset: 32, length: 64 })

    expect(meta.tag).toBe(96)
    expect(range).toEqual(plaintext.slice(32, 96))
  })

  it('range spanning chunk boundaries', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })

    // Decrypt bytes 32-95 (spans chunks 0 and 1)
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    const range = await decryptRange(fetcher, meta, cek, { offset: 32, length: 64 })
    expect(range).toEqual(plaintext.slice(32, 96))
  })

  it('range decryption of first chunk', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })

    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    const range = await decryptRange(fetcher, meta, cek, { offset: 0, length: 32 })
    expect(range).toEqual(plaintext.slice(0, 32))
  })

  it('range decryption of last chunk', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })

    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    const range = await decryptRange(fetcher, meta, cek, { offset: 192, length: 64 })
    expect(range).toEqual(plaintext.slice(192, 256))
  })

  it('non-seekable scheme throws SchemeNotSeekableError', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('not seekable')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    await expect(decryptRange(fetcher, meta, cek, { offset: 0, length: 5 })).rejects.toThrow(SchemeNotSeekableError)
  })
})

describe('BlobFetcher range decryption', () => {
  it('BlobFetcher: range from first chunk', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    const range = await decryptRange(fetcher, meta, cek, { offset: 0, length: 32 })
    expect(range).toEqual(plaintext.slice(0, 32))
  })

  it('BlobFetcher: range from middle chunk (global nonce test)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    // Chunk 2 (bytes 128-191) — this is the key test for issue 1
    const range = await decryptRange(fetcher, meta, cek, { offset: 128, length: 64 })
    expect(range).toEqual(plaintext.slice(128, 192))
  })

  it('BlobFetcher: range spanning chunk boundaries', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    // Spans chunks 1 and 2
    const range = await decryptRange(fetcher, meta, cek, { offset: 80, length: 64 })
    expect(range).toEqual(plaintext.slice(80, 144))
  })

  it('BlobFetcher: range from last chunk', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    const range = await decryptRange(fetcher, meta, cek, { offset: 192, length: 64 })
    expect(range).toEqual(plaintext.slice(192, 256))
  })

  it('BlobFetcher: decrypts all ranges correctly', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(320)
    for (let i = 0; i < 320; i++) plaintext[i] = i & 0xff

    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)

    const ranges = [
      { offset: 0, length: 64 },
      { offset: 64, length: 64 },
      { offset: 128, length: 128 },
      { offset: 200, length: 100 },
      { offset: 0, length: 320 },
    ]
    for (const r of ranges) {
      const result = await decryptRange(fetcher, meta, cek, r)
      expect(result).toEqual(plaintext.slice(r.offset, r.offset + r.length))
    }
  })
})

describe('new API (pre-parsed metadata)', () => {
  it('T001: parseEnvelope returns protectedHeaders field', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('hello')
    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM })
    const meta = parseEnvelope(blob)
    expect(meta.protectedHeaders).toBeInstanceOf(Uint8Array)
    expect(meta.protectedHeaders.length).toBeGreaterThan(0)
  })

  it('T002: parseEnvelope(BlobFetcher) async path calls fetchEnvelope once and returns correct metadata', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('hello')
    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM })
    const syncMeta = parseEnvelope(blob)
    let fetchCount = 0
    const fetcher: BlobFetcher = {
      async fetchEnvelope() {
        fetchCount++
        return blob.slice(0, syncMeta.envelopeSize)
      },
      async fetchRange(offset, length) {
        return blob.slice(offset, offset + length)
      },
    }
    const asyncMeta = await parseEnvelope(fetcher)
    expect(fetchCount).toBe(1)
    expect(asyncMeta.seekable).toBe(true)
    expect(asyncMeta.algorithm).toBe(syncMeta.algorithm)
    expect(asyncMeta.protectedHeaders).toBeInstanceOf(Uint8Array)
  })

  it('T003: decryptRange(fetcher, metadata, cek, range) decrypts correctly', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff
    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    const result = await decryptRange(fetcher, meta, cek, { offset: 64, length: 64 })
    expect(result).toEqual(plaintext.slice(64, 128))
  })

  it('T004: envelope is never fetched when decryptRange is called with pre-parsed metadata', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(256)
    for (let i = 0; i < 256; i++) plaintext[i] = i & 0xff
    const blob = await encrypt(plaintext, cek, {
      algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM,
      chunkSize: 64,
    })
    const meta = parseEnvelope(blob)
    let envelopeFetchCount = 0
    const countingFetcher: BlobFetcher = {
      async fetchEnvelope() {
        envelopeFetchCount++
        return blob.slice(0, meta.envelopeSize)
      },
      async fetchRange(offset, length) {
        return blob.slice(offset, offset + length)
      },
    }
    await decryptRange(countingFetcher, meta, cek, { offset: 0, length: 32 })
    await decryptRange(countingFetcher, meta, cek, { offset: 64, length: 32 })
    await decryptRange(countingFetcher, meta, cek, { offset: 128, length: 64 })
    expect(envelopeFetchCount).toBe(0)
  })

  it('T005: decryptRange throws SchemeNotSeekableError when metadata has non-seekable algorithm', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('not seekable')
    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const meta = parseEnvelope(blob)
    const fetcher = makeBlobFetcher(blob)
    await expect(decryptRange(fetcher, meta, cek, { offset: 0, length: 5 })).rejects.toThrow(SchemeNotSeekableError)
  })
})
