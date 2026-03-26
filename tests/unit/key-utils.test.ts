import { describe, expect, it } from 'vitest'
import { validateCek } from '../../src/key-utils.ts'
import { InvalidKeyError } from '../../src/errors.ts'

describe('validateCek', () => {
  it('accepts a valid 32-byte key', () => {
    const key = crypto.getRandomValues(new Uint8Array(32))
    expect(() => validateCek(key)).not.toThrow()
  })

  it('rejects a key shorter than 32 bytes', () => {
    const key = new Uint8Array(16)
    expect(() => validateCek(key)).toThrow(InvalidKeyError)
  })

  it('rejects a key longer than 32 bytes', () => {
    const key = new Uint8Array(64)
    expect(() => validateCek(key)).toThrow(InvalidKeyError)
  })

  it('rejects an all-zero key', () => {
    const key = new Uint8Array(32)
    expect(() => validateCek(key)).toThrow(InvalidKeyError)
  })
})
