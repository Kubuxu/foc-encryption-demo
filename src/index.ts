export { decrypt, decryptRange, encrypt } from './envelope.js'
export { CoseAlgorithm, CoseHeaderParam } from './cose/headers.js'
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
} from './types.js'
export {
  FocEncryptionError,
  InvalidKeyError,
  AuthenticationError,
  UnsupportedSchemeError,
  MalformedEnvelopeError,
  SchemeNotSeekableError,
} from './errors.js'
