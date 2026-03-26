/**
 * Public API Contract — foc-encryption
 *
 * This file defines the TypeScript interfaces that the library exposes.
 * It serves as the contract between the library and its consumers.
 * Implementation MUST conform to these interfaces.
 */

// ---------------------------------------------------------------------------
// Core Types
// ---------------------------------------------------------------------------

/** Supported input data types for encryption */
export type EncryptInput = Uint8Array | ReadableStream<Uint8Array>

/** Content Encryption Key — exactly 32 bytes for AES-256 */
export type CEKBytes = Uint8Array

/** Byte range for seekable decryption */
export interface ByteRange {
  /** Byte offset from start of plaintext */
  offset: number
  /** Number of bytes to decrypt */
  length: number
}

// ---------------------------------------------------------------------------
// Encryption Schemes
// ---------------------------------------------------------------------------

/** COSE algorithm identifiers used by this library */
export const CoseAlgorithm = {
  /** AES-256-GCM — IANA registered, algorithm ID 3 */
  AES_256_GCM: 3,
  /** Chunked AES-256-GCM STREAM — private-use */
  CHUNKED_AES_256_GCM_STREAM: -65793,
} as const

/** COSE header parameter labels (private-use range) */
export const CoseHeaderParam = {
  /** Chunk size in bytes (uint) */
  CHUNK_SIZE: -65790,
  /** Total chunk count (uint) */
  CHUNK_COUNT: -65791,
  /** Application metadata (CBOR map with string keys) */
  APP_METADATA: -65792,
} as const

export type CoseAlgorithmId = (typeof CoseAlgorithm)[keyof typeof CoseAlgorithm]

/** Configuration for the chunked (seekable) encryption scheme */
export interface ChunkedEncryptionOptions {
  /** Chunk size in bytes. Default: 262144 (256 KiB) */
  chunkSize?: number
}

/** Application-level metadata stored in the app_metadata COSE header */
export interface AppMetadata {
  /** Original plaintext content identifier (CID) */
  cid?: Uint8Array
  /** Additional application-defined fields (string-keyed) */
  [key: string]: Uint8Array | string | number | boolean | undefined
}

// ---------------------------------------------------------------------------
// Encryption Options
// ---------------------------------------------------------------------------

/** Options for simple (non-seekable) encryption */
export interface SimpleEncryptOptions {
  algorithm: typeof CoseAlgorithm.AES_256_GCM
  /** Optional application metadata to embed in envelope */
  appMetadata?: AppMetadata
}

/** Options for chunked (seekable) encryption */
export interface ChunkedEncryptOptions {
  algorithm: typeof CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM
  /** Chunk size in bytes. Default: 262144 (256 KiB) */
  chunkSize?: number
  /** Optional application metadata to embed in envelope */
  appMetadata?: AppMetadata
}

export type EncryptOptions = SimpleEncryptOptions | ChunkedEncryptOptions

// ---------------------------------------------------------------------------
// Envelope Metadata (read-only, from parsing)
// ---------------------------------------------------------------------------

/** Parsed envelope metadata — available without decryption key */
export interface EnvelopeMetadata {
  /** COSE algorithm identifier */
  algorithm: CoseAlgorithmId
  /** Whether the scheme supports seekable (range) decryption */
  seekable: boolean
  /** IV/nonce (12 bytes for simple, 7-byte base nonce for chunked) */
  iv: Uint8Array
  /** Chunk size in bytes (only present for chunked scheme) */
  chunkSize?: number
  /** Total chunk count (only present for chunked scheme) */
  chunkCount?: number
  /** Application metadata (from app_metadata header) */
  appMetadata?: AppMetadata
  /** Key management recipients (empty array for COSE_Encrypt0) */
  recipients: RecipientInfo[]
  /** Byte length of the COSE envelope in the blob */
  envelopeSize: number
}

/** Read-only view of a recipient descriptor */
export interface RecipientInfo {
  /** Key management algorithm identifier */
  algorithm: number
  /** Key identifier (if present) */
  keyId?: Uint8Array
  /** Wrapped CEK (if present) */
  wrappedKey?: Uint8Array
}

// ---------------------------------------------------------------------------
// Recipient / Key Management (pluggable)
// ---------------------------------------------------------------------------

/** A recipient descriptor for multi-recipient encryption (COSE_Encrypt) */
export interface Recipient {
  /** Key management algorithm identifier (COSE alg) */
  algorithm: number
  /** Key identifier */
  keyId?: Uint8Array
  /** Wrapped CEK bytes */
  wrappedKey: Uint8Array
  /** Additional unprotected header parameters */
  unprotectedHeaders?: Map<number, unknown>
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext data and produce an encrypted blob.
 *
 * The returned blob is: [COSE envelope || ciphertext]
 * The envelope is CBOR self-delimiting, so readers can parse it
 * and treat the remainder as ciphertext.
 *
 * @param plaintext - Data to encrypt
 * @param cek - 32-byte content encryption key
 * @param options - Encryption scheme and parameters
 * @param recipients - Optional recipient descriptors (omit for COSE_Encrypt0)
 * @returns Encrypted blob as Uint8Array
 */
export declare function encrypt(
  plaintext: Uint8Array,
  cek: CEKBytes,
  options: EncryptOptions,
  recipients?: Recipient[],
): Promise<Uint8Array>

/**
 * Decrypt an encrypted blob and return the plaintext.
 *
 * @param blob - Encrypted blob (envelope + ciphertext)
 * @param cek - 32-byte content encryption key
 * @returns Decrypted plaintext
 */
export declare function decrypt(
  blob: Uint8Array,
  cek: CEKBytes,
): Promise<Uint8Array>

/**
 * Decrypt a byte range from a seekable-encrypted blob.
 *
 * Only works with seekable encryption schemes (Chunked-AES-256-GCM-STREAM).
 * Decrypts only the chunks covering the requested range.
 *
 * @param blob - Full encrypted blob, or a function that fetches byte ranges
 * @param cek - 32-byte content encryption key
 * @param range - Byte range to decrypt (in plaintext coordinates)
 * @returns Decrypted bytes for the requested range
 * @throws {SchemeNotSeekableError} if the envelope uses a non-seekable scheme
 */
export declare function decryptRange(
  blob: Uint8Array | BlobFetcher,
  cek: CEKBytes,
  range: ByteRange,
): Promise<Uint8Array>

/**
 * Fetcher interface for range-based decryption without loading the full blob.
 * Enables HTTP Range request integration.
 */
export interface BlobFetcher {
  /** Fetch the envelope (reads from offset 0 until envelope is fully parsed) */
  fetchEnvelope(): Promise<Uint8Array>
  /** Fetch a byte range from the blob */
  fetchRange(offset: number, length: number): Promise<Uint8Array>
}

/**
 * Parse envelope metadata from a blob without decrypting.
 *
 * @param blob - Encrypted blob (at minimum, the envelope portion)
 * @returns Parsed envelope metadata
 * @throws {MalformedEnvelopeError} if the blob does not start with a valid COSE envelope
 */
export declare function parseEnvelope(
  blob: Uint8Array,
): EnvelopeMetadata

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

/** Base error class for all library errors */
export declare class FocEncryptionError extends Error {
  readonly code: string
}

/** CEK is invalid (wrong size, all zeros, etc.) */
export declare class InvalidKeyError extends FocEncryptionError {
  readonly code: 'INVALID_KEY'
}

/** AEAD authentication failed — tampered ciphertext or wrong key */
export declare class AuthenticationError extends FocEncryptionError {
  readonly code: 'AUTHENTICATION_FAILED'
}

/** Encryption scheme is not recognized or not supported */
export declare class UnsupportedSchemeError extends FocEncryptionError {
  readonly code: 'UNSUPPORTED_SCHEME'
  readonly algorithmId: number
}

/** COSE envelope is malformed or cannot be parsed */
export declare class MalformedEnvelopeError extends FocEncryptionError {
  readonly code: 'MALFORMED_ENVELOPE'
}

/** Range decryption requested on a non-seekable scheme */
export declare class SchemeNotSeekableError extends FocEncryptionError {
  readonly code: 'SCHEME_NOT_SEEKABLE'
}
