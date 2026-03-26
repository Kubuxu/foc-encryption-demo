export { encrypt, decrypt } from './envelope.ts'
export { CoseAlgorithm, CoseHeaderParam } from './cose/headers.ts'
export type {
  CEKBytes,
  EncryptOptions,
  SimpleEncryptOptions,
  ChunkedEncryptOptions,
  AppMetadata,
  EnvelopeMetadata,
  Recipient,
  RecipientInfo,
  ByteRange,
  BlobFetcher,
  CoseAlgorithmId,
} from './types.ts'
export {
  FocEncryptionError,
  InvalidKeyError,
  AuthenticationError,
  UnsupportedSchemeError,
  MalformedEnvelopeError,
  SchemeNotSeekableError,
} from './errors.ts'
