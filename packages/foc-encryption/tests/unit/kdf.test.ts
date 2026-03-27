import { describe, expect, it } from 'vitest'
import { deriveKey, hexToBytes } from '../../src/kdf.js'

describe('hexToBytes', () => {
  it('converts a valid 64-char hex string to 32 bytes', () => {
    const hex = 'a'.repeat(64)
    const bytes = hexToBytes(hex)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes.length).toBe(32)
  })

  it('throws when hex string is too short', () => {
    expect(() => hexToBytes('a'.repeat(63))).toThrow(/64 hex characters/)
  })

  it('throws when hex string is too long', () => {
    expect(() => hexToBytes('a'.repeat(65))).toThrow(/64 hex characters/)
  })

  it('throws on non-hex characters', () => {
    expect(() => hexToBytes('g'.repeat(64))).toThrow(/non-hex/)
  })

  it('decodes known hex value correctly', () => {
    const hex = `${'0'.repeat(62)}ff`
    const bytes = hexToBytes(hex)
    expect(bytes[31]).toBe(0xff)
    expect(bytes[0]).toBe(0x00)
  })
})

describe('deriveKey', () => {
  it('returns 32-byte CEK for hex source', async () => {
    const source = { kind: 'hex' as const, hex: 'ab'.repeat(32) }
    const result = await deriveKey(source)
    expect(result.cek).toBeInstanceOf(Uint8Array)
    expect(result.cek.length).toBe(32)
    expect(result.salt).toBeUndefined()
  })

  it('returns 32-byte CEK and 16-byte salt for password source', async () => {
    const source = { kind: 'password' as const, password: 'test-password' }
    const result = await deriveKey(source)
    expect(result.cek).toBeInstanceOf(Uint8Array)
    expect(result.cek.length).toBe(32)
    expect(result.salt).toBeInstanceOf(Uint8Array)
    expect(result.salt?.length).toBe(16)
  })

  it('produces same key from same password and same salt', async () => {
    const source = { kind: 'password' as const, password: 'same-password' }
    const salt = new Uint8Array(16).fill(42)
    const result1 = await deriveKey(source, salt)
    const result2 = await deriveKey(source, salt)
    expect(result1.cek).toEqual(result2.cek)
  })

  it('produces different keys from same password with different salts', async () => {
    const source = { kind: 'password' as const, password: 'same-password' }
    const salt1 = new Uint8Array(16).fill(1)
    const salt2 = new Uint8Array(16).fill(2)
    const result1 = await deriveKey(source, salt1)
    const result2 = await deriveKey(source, salt2)
    expect(result1.cek).not.toEqual(result2.cek)
  })

  it('generates a random salt when none is provided for password source', async () => {
    const source = { kind: 'password' as const, password: 'test-password' }
    const result1 = await deriveKey(source)
    const result2 = await deriveKey(source)
    expect(result1.salt).not.toEqual(result2.salt)
    expect(result1.cek).not.toEqual(result2.cek)
  })
})
