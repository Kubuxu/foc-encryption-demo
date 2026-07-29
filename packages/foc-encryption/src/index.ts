/**
 * foc-encryption — COSE-based encryption envelopes for content-addressed data.
 *
 * Provides AES-256-GCM encryption with COSE_Encrypt0/COSE_Encrypt envelopes,
 * optional chunked STREAM construction for seekable decryption, multi-recipient
 * key management descriptors, and keyless envelope inspection.
 *
 * @packageDocumentation
 */

/** Encrypt plaintext into a COSE envelope + ciphertext blob. */
export { decrypt, decryptRange, encrypt, parseEnvelope } from './envelope.js'

/** COSE algorithm identifiers and header parameter labels. */
export { CoseAlgorithm, CoseHeaderParam } from './cose/headers.js'

export type {
  /** Application-level metadata stored in the COSE envelope. */
  AppMetadata,
  /** Fetcher interface for range-based decryption without loading the full blob. */
  BlobFetcher,
  /** Byte range for seekable decryption (plaintext coordinates). */
  ByteRange,
  /** 32-byte content encryption key. */
  CEKBytes,
  /** Options for chunked (seekable) encryption. */
  ChunkedEncryptOptions,
  /** Union of supported COSE algorithm IDs. */
  CoseAlgorithmId,
  /** COSE envelope tags that determine the authenticated encryption context. */
  CoseEnvelopeTag,
  /** Options for encrypt(): algorithm selection and optional metadata. */
  EncryptOptions,
  /** Parsed envelope metadata — available without a decryption key. */
  EnvelopeMetadata,
  /** Recipient descriptor for multi-recipient encryption (COSE_Encrypt). */
  Recipient,
  /** Read-only view of a parsed recipient descriptor. */
  RecipientInfo,
  /** Options for simple (non-seekable) encryption. */
  SimpleEncryptOptions,
} from './types.js'

/** Derive a content encryption key from a password or raw hex material. */
export type { KeySource, DerivedKey } from './kdf.js'
export { deriveKey } from './kdf.js'

export {
  /** AEAD authentication failed — tampered ciphertext or wrong key. */
  AuthenticationError,
  /** Base error class for all library errors. */
  FocEncryptionError,
  /** CEK is invalid (wrong size, all zeros). */
  InvalidKeyError,
  /** COSE envelope is malformed or cannot be parsed. */
  MalformedEnvelopeError,
  /** Range decryption requested on a non-seekable scheme. */
  SchemeNotSeekableError,
  /** Encryption scheme is not recognized or not supported. */
  UnsupportedSchemeError,
} from './errors.js'
