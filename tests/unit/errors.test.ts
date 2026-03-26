import { describe, expect, it } from 'vitest'
import {
  AuthenticationError,
  FocEncryptionError,
  InvalidKeyError,
  MalformedEnvelopeError,
  SchemeNotSeekableError,
  UnsupportedSchemeError,
} from '../../src/errors.js'

describe('FocEncryptionError', () => {
  it('is an instance of Error', () => {
    const err = new FocEncryptionError('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err.message).toBe('test')
    expect(err.code).toBe('FOC_ENCRYPTION_ERROR')
  })
})

describe('InvalidKeyError', () => {
  it('has code INVALID_KEY and extends FocEncryptionError', () => {
    const err = new InvalidKeyError('bad key')
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err).toBeInstanceOf(Error)
    expect(err.code).toBe('INVALID_KEY')
    expect(err.message).toBe('bad key')
  })
})

describe('AuthenticationError', () => {
  it('has code AUTHENTICATION_FAILED and extends FocEncryptionError', () => {
    const err = new AuthenticationError('tampered')
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err.code).toBe('AUTHENTICATION_FAILED')
    expect(err.message).toBe('tampered')
  })
})

describe('UnsupportedSchemeError', () => {
  it('has code UNSUPPORTED_SCHEME and exposes algorithmId', () => {
    const err = new UnsupportedSchemeError(999)
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err.code).toBe('UNSUPPORTED_SCHEME')
    expect(err.algorithmId).toBe(999)
    expect(err.message).toContain('999')
  })
})

describe('MalformedEnvelopeError', () => {
  it('has code MALFORMED_ENVELOPE and extends FocEncryptionError', () => {
    const err = new MalformedEnvelopeError('bad cbor')
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err.code).toBe('MALFORMED_ENVELOPE')
    expect(err.message).toBe('bad cbor')
  })
})

describe('SchemeNotSeekableError', () => {
  it('has code SCHEME_NOT_SEEKABLE and extends FocEncryptionError', () => {
    const err = new SchemeNotSeekableError('not seekable')
    expect(err).toBeInstanceOf(FocEncryptionError)
    expect(err.code).toBe('SCHEME_NOT_SEEKABLE')
    expect(err.message).toBe('not seekable')
  })
})
