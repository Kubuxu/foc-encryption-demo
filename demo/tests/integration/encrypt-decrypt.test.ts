import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseEnvelope } from 'foc-encryption'
import { encryptFile } from '../../src/commands/encrypt.js'

describe('encrypt command', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'foc-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('encrypts a file with hex key to a valid foc-encryption blob', async () => {
    const inputPath = join(tempDir, 'input.txt')
    const outputPath = join(tempDir, 'input.txt.enc')
    await writeFile(inputPath, 'Hello, FOC encryption! This is a small test file.')

    await encryptFile({
      file: inputPath,
      key: 'aa'.repeat(32),
      output: outputPath,
    })

    const blob = new Uint8Array(await readFile(outputPath))
    const meta = parseEnvelope(blob)
    expect(meta).toBeDefined()
    expect(meta.seekable).toBe(false) // small file → AES-256-GCM
    expect(meta.appMetadata?.pbkdf2_salt).toBeUndefined()
  })

  it('encrypts with password and stores PBKDF2 salt in appMetadata', async () => {
    const inputPath = join(tempDir, 'input.txt')
    const outputPath = join(tempDir, 'input.txt.enc')
    await writeFile(inputPath, 'Password-encrypted content for testing')

    await encryptFile({
      file: inputPath,
      password: 'testpassword',
      output: outputPath,
    })

    const blob = new Uint8Array(await readFile(outputPath))
    const meta = parseEnvelope(blob)
    expect(meta).toBeDefined()
    expect(meta.appMetadata).toBeDefined()
    expect(meta.appMetadata!.pbkdf2_salt).toBeInstanceOf(Uint8Array)
    expect((meta.appMetadata!.pbkdf2_salt as Uint8Array).length).toBe(16)
    expect(meta.appMetadata!.pbkdf2_iterations).toBe(600_000)
    expect(meta.appMetadata!.pbkdf2_hash).toBe('SHA-256')
  })

  it('defaults output path to <file>.enc when --output not specified', async () => {
    const inputPath = join(tempDir, 'myfile.dat')
    await writeFile(inputPath, 'some data to encrypt')

    await encryptFile({
      file: inputPath,
      key: 'bb'.repeat(32),
    })

    const blob = new Uint8Array(await readFile(`${inputPath}.enc`))
    const meta = parseEnvelope(blob)
    expect(meta).toBeDefined()
  })
})
