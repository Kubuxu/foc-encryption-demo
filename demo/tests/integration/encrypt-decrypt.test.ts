import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { writeFile, readFile, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseEnvelope } from 'foc-encryption'
import { encryptFile } from '../../src/commands/encrypt.js'
import { decryptFile } from '../../src/commands/decrypt.js'

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

describe('decrypt command', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'foc-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true })
  })

  it('full round-trip with hex key: encrypt then decrypt produces identical plaintext', async () => {
    const original = 'Hello, FOC round-trip! The plaintext must survive encryption and decryption.'
    const inputPath = join(tempDir, 'input.txt')
    const encPath = join(tempDir, 'input.txt.enc')
    const decPath = join(tempDir, 'decrypted.txt')
    await writeFile(inputPath, original)

    await encryptFile({ file: inputPath, key: 'cc'.repeat(32), output: encPath })
    await decryptFile({ file: encPath, key: 'cc'.repeat(32), output: decPath })

    const result = await readFile(decPath, 'utf8')
    expect(result).toBe(original)
  })

  it('full round-trip with password: encrypt then decrypt produces identical plaintext', async () => {
    const original = 'Password round-trip test content.'
    const inputPath = join(tempDir, 'pw-input.txt')
    const encPath = join(tempDir, 'pw-input.txt.enc')
    const decPath = join(tempDir, 'pw-decrypted.txt')
    await writeFile(inputPath, original)

    await encryptFile({ file: inputPath, password: 'correcthorsebatterystaple', output: encPath })
    await decryptFile({ file: encPath, password: 'correcthorsebatterystaple', output: decPath })

    const result = await readFile(decPath, 'utf8')
    expect(result).toBe(original)
  })

  it('wrong password returns an actionable error', async () => {
    const inputPath = join(tempDir, 'secret.txt')
    const encPath = join(tempDir, 'secret.txt.enc')
    await writeFile(inputPath, 'super secret data')

    await encryptFile({ file: inputPath, password: 'rightpassword', output: encPath })

    await expect(
      decryptFile({ file: encPath, password: 'wrongpassword', output: join(tempDir, 'out.txt') })
    ).rejects.toThrow()
  })

  it('defaults output path by stripping .enc suffix', async () => {
    const original = 'default output path test'
    const inputPath = join(tempDir, 'file.txt')
    const encPath = join(tempDir, 'file.txt.enc')
    await writeFile(inputPath, original)

    await encryptFile({ file: inputPath, key: 'dd'.repeat(32), output: encPath })
    await decryptFile({ file: encPath, key: 'dd'.repeat(32) })

    const result = await readFile(join(tempDir, 'file.txt.dec'), 'utf8')
    expect(result).toBe(original)
  })
})
