export class FocEncryptionError extends Error {
  readonly code: string = 'FOC_ENCRYPTION_ERROR'

  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = this.constructor.name
  }
}

export class InvalidKeyError extends FocEncryptionError {
  readonly code = 'INVALID_KEY' as const
}

export class AuthenticationError extends FocEncryptionError {
  readonly code = 'AUTHENTICATION_FAILED' as const
}

export class UnsupportedSchemeError extends FocEncryptionError {
  readonly code = 'UNSUPPORTED_SCHEME' as const
  readonly algorithmId: number

  constructor(algorithmId: number) {
    super(`Unsupported encryption scheme: algorithm ID ${algorithmId}`)
    this.algorithmId = algorithmId
  }
}

export class MalformedEnvelopeError extends FocEncryptionError {
  readonly code = 'MALFORMED_ENVELOPE' as const
}

export class SchemeNotSeekableError extends FocEncryptionError {
  readonly code = 'SCHEME_NOT_SEEKABLE' as const
}
