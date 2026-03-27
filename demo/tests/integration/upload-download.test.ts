import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { encrypt, parseEnvelope, CoseAlgorithm } from 'foc-encryption'

vi.mock('../../src/synapse.js', () => ({
  createSynapseClient: vi.fn(),
  createBlobFetcher: vi.fn(),
}))

import { uploadFile } from '../../src/commands/upload.js'
import { downloadFile } from '../../src/commands/download.js'
import { createSynapseClient } from '../../src/synapse.js'

describe('upload command', () => {
  let tempDir: string
  let capturedBlob: Uint8Array | undefined

  const fakePieceCid = 'baga6ea4seaqtest1234567890'
  const fakeRetrievalUrl = 'https://retrieval.example.com/piece/baga6ea4seaqtest1234567890'

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'foc-upload-test-'))
    capturedBlob = undefined

    vi.mocked(createSynapseClient).mockReturnValue({
      storage: {
        prepare: vi.fn().mockResolvedValue({
          costs: {
            rate: { perEpoch: 1000n, perMonth: 2592000000n },
            depositNeeded: 0n,
            needsFwssMaxApproval: false,
            ready: true,
          },
          transaction: null,
        }),
        upload: vi.fn(async (data: Uint8Array) => {
          capturedBlob = new Uint8Array(data)
          return {
            pieceCid: { toString: () => fakePieceCid },
            size: data.length,
            copies: [{ retrievalUrl: fakeRetrievalUrl }],
            requestedCopies: 1,
            complete: true,
            failedAttempts: [],
          }
        }),
      },
    } as any)
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.clearAllMocks()
  })

  it('encrypts file before uploading — blob passed to upload is a valid foc-encryption envelope', async () => {
    const inputPath = join(tempDir, 'testfile.txt')
    await writeFile(inputPath, 'Hello, upload test! Small file for non-chunked encryption.')

    const logs: string[] = []
    const origLog = console.log
    console.log = (...args: unknown[]) => logs.push(args.join(' '))

    try {
      await uploadFile({
        file: inputPath,
        key: 'aa'.repeat(32),
        privateKey: '0x' + 'ab'.repeat(32),
      })
    } finally {
      console.log = origLog
    }

    expect(capturedBlob).toBeDefined()
    // Blob passed to upload must be a valid foc-encryption envelope
    const meta = parseEnvelope(capturedBlob!)
    expect(meta).toBeDefined()

    // PieceCID must appear in output
    expect(logs.some((l) => l.includes(fakePieceCid))).toBe(true)
    // Retrieval URL must appear in output
    expect(logs.some((l) => l.includes(fakeRetrievalUrl))).toBe(true)
  })

  it('uses FOC_PRIVATE_KEY env var when --private-key not provided', async () => {
    const inputPath = join(tempDir, 'testfile2.txt')
    await writeFile(inputPath, 'env var test content')

    const origEnv = process.env.FOC_PRIVATE_KEY
    process.env.FOC_PRIVATE_KEY = '0x' + 'cd'.repeat(32)

    try {
      await uploadFile({
        file: inputPath,
        key: 'bb'.repeat(32),
      })
    } finally {
      if (origEnv === undefined) {
        delete process.env.FOC_PRIVATE_KEY
      } else {
        process.env.FOC_PRIVATE_KEY = origEnv
      }
    }

    expect(createSynapseClient).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: '0x' + 'cd'.repeat(32) })
    )
  })

  it('throws actionable error when no private key is provided', async () => {
    const inputPath = join(tempDir, 'testfile3.txt')
    await writeFile(inputPath, 'error test content')

    const origEnv = process.env.FOC_PRIVATE_KEY
    delete process.env.FOC_PRIVATE_KEY

    try {
      await expect(
        uploadFile({
          file: inputPath,
          key: 'cc'.repeat(32),
        })
      ).rejects.toThrow('FOC_PRIVATE_KEY')
    } finally {
      if (origEnv !== undefined) {
        process.env.FOC_PRIVATE_KEY = origEnv
      }
    }
  })

  it('upload command with password stores PBKDF2 salt in the encrypted blob', async () => {
    const inputPath = join(tempDir, 'pw-upload.txt')
    await writeFile(inputPath, 'Password upload test content')

    await uploadFile({
      file: inputPath,
      password: 'secretpassword',
      privateKey: '0x' + 'ef'.repeat(32),
    })

    expect(capturedBlob).toBeDefined()
    const meta = parseEnvelope(capturedBlob!)
    expect(meta.appMetadata).toBeDefined()
    expect(meta.appMetadata!.pbkdf2_salt).toBeInstanceOf(Uint8Array)
  })
})

describe('download command', () => {
  let tempDir: string

  const hexKey = 'aa'.repeat(32)
  const plaintextContent = 'Hello, download test! Round-trip content.'

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'foc-download-test-'))
    vi.clearAllMocks()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
    vi.restoreAllMocks()
  })

  it('URL locator: downloads and decrypts blob — no wallet needed', async () => {
    // Pre-encrypt content
    const keyBytes = new Uint8Array(Buffer.from(hexKey, 'hex'))
    const plaintext = new TextEncoder().encode(plaintextContent)
    const blob = await encrypt(plaintext, keyBytes, { algorithm: CoseAlgorithm.AES_256_GCM })

    const fakeUrl = 'https://retrieval.example.com/piece/testcid'

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(blob, { status: 200 })
    )

    const outputPath = join(tempDir, 'downloaded.txt')
    await downloadFile({
      locator: fakeUrl,
      key: hexKey,
      output: outputPath,
    })

    const downloaded = await import('node:fs/promises').then((m) => m.readFile(outputPath))
    expect(new TextDecoder().decode(downloaded)).toBe(plaintextContent)

    // URL locator must NOT create a synapse client
    expect(createSynapseClient).not.toHaveBeenCalled()
  })

  it('URL locator with password: uses salt from envelope for decryption', async () => {
    // Encrypt with password-derived key (embed salt in metadata)
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'), 'PBKDF2', false, ['deriveBits'])
    const keyBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 600_000, hash: 'SHA-256' }, keyMaterial, 256)
    const keyBytes = new Uint8Array(keyBits)

    const plaintext = new TextEncoder().encode('password round-trip test')
    const blob = await encrypt(plaintext, keyBytes, {
      algorithm: CoseAlgorithm.AES_256_GCM,
      appMetadata: { pbkdf2_salt: salt, pbkdf2_iterations: 600_000, pbkdf2_hash: 'SHA-256' },
    })

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(blob, { status: 200 })
    )

    const outputPath = join(tempDir, 'pw-downloaded.txt')
    await downloadFile({
      locator: 'https://example.com/blob',
      password: 'secret',
      output: outputPath,
    })

    const downloaded = await import('node:fs/promises').then((m) => m.readFile(outputPath))
    expect(new TextDecoder().decode(downloaded)).toBe('password round-trip test')
  })

  it('PieceCID locator: downloads via synapse storage.download and decrypts', async () => {
    const keyBytes = new Uint8Array(Buffer.from(hexKey, 'hex'))
    const plaintext = new TextEncoder().encode('piececid round-trip content')
    const blob = await encrypt(plaintext, keyBytes, { algorithm: CoseAlgorithm.AES_256_GCM })

    vi.mocked(createSynapseClient).mockReturnValue({
      storage: {
        download: vi.fn().mockResolvedValue(blob),
      },
    } as any)

    const outputPath = join(tempDir, 'cid-downloaded.txt')
    await downloadFile({
      locator: 'baga6ea4seaqtest',
      key: hexKey,
      privateKey: '0x' + 'ab'.repeat(32),
      output: outputPath,
    })

    const downloaded = await import('node:fs/promises').then((m) => m.readFile(outputPath))
    expect(new TextDecoder().decode(downloaded)).toBe('piececid round-trip content')
    expect(createSynapseClient).toHaveBeenCalledWith(
      expect.objectContaining({ privateKey: '0x' + 'ab'.repeat(32) })
    )
  })
})
