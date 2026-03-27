import { describe, expect, it } from 'vitest'
import { deriveKey } from 'foc-encryption'
import { parseKeySource } from '../../src/key.js'

describe('parseKeySource', () => {
  it('returns hex source when --key is provided', () => {
    const source = parseKeySource({ key: 'a'.repeat(64) })
    expect(source.kind).toBe('hex')
    if (source.kind === 'hex') {
      expect(source.hex).toBe('a'.repeat(64))
    }
  })

  it('returns password source when --password is provided', () => {
    const source = parseKeySource({ password: 'secret' })
    expect(source.kind).toBe('password')
    if (source.kind === 'password') {
      expect(source.password).toBe('secret')
    }
  })

  it('throws when neither --key nor --password is provided', () => {
    expect(() => parseKeySource({})).toThrow(/--password or --key/)
  })

  it('throws when both --key and --password are provided', () => {
    expect(() => parseKeySource({ key: 'a'.repeat(64), password: 'secret' })).toThrow()
  })
})

describe('smoke — deriveKey from foc-encryption', () => {
  it('returns a 32-byte CEK for a known password and salt', async () => {
    const source = { kind: 'password' as const, password: 'smoke-test-password' }
    const salt = new Uint8Array(16).fill(7)
    const result = await deriveKey(source, salt)
    expect(result.cek).toBeInstanceOf(Uint8Array)
    expect(result.cek.length).toBe(32)
    expect(result.salt).toBeInstanceOf(Uint8Array)
    expect(result.salt?.length).toBe(16)
  })
})
