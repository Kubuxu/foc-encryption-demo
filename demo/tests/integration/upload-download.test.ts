import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseEnvelope } from 'foc-encryption'

vi.mock('../../src/synapse.js', () => ({
  createSynapseClient: vi.fn(),
  createBlobFetcher: vi.fn(),
}))

import { uploadFile } from '../../src/commands/upload.js'
import { createSynapseClient } from '../../src/synapse.js'

describe('upload command', () => {
  let tempDir: string
  let capturedBlob: Uint8Array | undefined

  const fakePieceCid = 'baga6ea4seaqtest1234567890'
  const fakeRetrievalUrl = 'https://retrieval.example.com/piece/baga6ea4seaqtest1234567890'

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'foc-upload-test-'))
    capturedBlob = undefined

    vi.mocked(createSynapseClient).mockResolvedValue({
      createStorage: vi.fn().mockResolvedValue({
        upload: vi.fn((data: Uint8Array) => {
          capturedBlob = new Uint8Array(data)
          return {
            commp: vi.fn().mockResolvedValue({ toString: () => fakePieceCid }),
            store: vi.fn().mockResolvedValue('mock-storage-provider'),
            done: vi.fn().mockResolvedValue(fakeRetrievalUrl),
          }
        }),
      }),
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
