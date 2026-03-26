import { assembleBlob, parseBlob } from './blob.js'
import { decodeCoseEnvelope } from './cose/decode.js'
import { encodeCoseEncrypt, encodeCoseEncrypt0, getProtectedHeaderBytes } from './cose/encode.js'
import { CoseAlgorithm } from './cose/headers.js'
import { MalformedEnvelopeError, SchemeNotSeekableError, UnsupportedSchemeError } from './errors.js'
import { importAndZeroCek, validateCek } from './key-utils.js'
import { Aes256Gcm } from './schemes/aes-256-gcm.js'
import { ChunkedAes256GcmStream } from './schemes/chunked-aes-256-gcm.js'
import type { DecryptMetadata, EncryptionScheme } from './schemes/scheme.js'
import type {
  AppMetadata,
  BlobFetcher,
  ByteRange,
  CEKBytes,
  ChunkedEncryptOptions,
  CoseAlgorithmId,
  EncryptOptions,
  EnvelopeMetadata,
  Recipient,
} from './types.js'

function getScheme(algorithmId: number, chunkSize?: number): EncryptionScheme {
  switch (algorithmId) {
    case CoseAlgorithm.AES_256_GCM:
      return new Aes256Gcm()
    case CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM:
      return new ChunkedAes256GcmStream(chunkSize ? { chunkSize } : undefined)
    default:
      throw new UnsupportedSchemeError(algorithmId)
  }
}

export async function encrypt(
  plaintext: Uint8Array,
  cek: CEKBytes,
  options: EncryptOptions,
  recipients?: Recipient[]
): Promise<Uint8Array> {
  validateCek(cek)
  const chunkSize =
    options.algorithm === CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM
      ? (options as ChunkedEncryptOptions).chunkSize
      : undefined
  const scheme = getScheme(options.algorithm, chunkSize)
  const protectedHeaders = getProtectedHeaderBytes(options.algorithm)

  const cekCopy = new Uint8Array(cek)
  const key = await importAndZeroCek(cekCopy)

  const result = await scheme.encrypt(key, plaintext, protectedHeaders, options.appMetadata)

  let envelope: Uint8Array
  const encodeOpts = {
    appMetadata: options.appMetadata,
    chunkSize: result.chunkSize,
    chunkCount: result.chunkCount,
  }

  if (recipients && recipients.length > 0) {
    envelope = encodeCoseEncrypt(options.algorithm, result.iv, recipients, encodeOpts)
  } else {
    envelope = encodeCoseEncrypt0(options.algorithm, result.iv, encodeOpts)
  }

  return assembleBlob(envelope, result.ciphertext)
}

export async function decrypt(blob: Uint8Array, cek: CEKBytes): Promise<Uint8Array> {
  const parsed = parseBlob(blob)
  const envelope = decodeCoseEnvelope(parsed.envelopeBytes)

  const scheme = getScheme(envelope.algorithm, envelope.chunkSize)

  const cekCopy = new Uint8Array(cek)
  const key = await importAndZeroCek(cekCopy)

  const metadata: DecryptMetadata = { chunkSize: envelope.chunkSize, chunkCount: envelope.chunkCount }
  return scheme.decrypt(key, parsed.ciphertext, envelope.iv, envelope.protectedHeaders, metadata)
}

export async function decryptRange(
  blob: Uint8Array | BlobFetcher,
  cek: CEKBytes,
  range: ByteRange
): Promise<Uint8Array> {
  let envelopeBytes: Uint8Array
  let ciphertext: Uint8Array

  if (blob instanceof Uint8Array) {
    const parsed = parseBlob(blob)
    envelopeBytes = parsed.envelopeBytes
    ciphertext = parsed.ciphertext
  } else {
    const fetched = await blob.fetchEnvelope()
    const parsed = parseBlob(fetched)
    envelopeBytes = parsed.envelopeBytes
    // We need to fetch the specific ciphertext range after computing chunk indices
    ciphertext = parsed.ciphertext // May be partial; will fetch more below
  }

  const envelope = decodeCoseEnvelope(envelopeBytes)
  const scheme = getScheme(envelope.algorithm, envelope.chunkSize)

  if (!scheme.isSeekable) {
    throw new SchemeNotSeekableError(
      `Scheme ${scheme.name} (algorithm ${scheme.algorithmId}) does not support range decryption`
    )
  }

  const cekCopy = new Uint8Array(cek)
  const key = await importAndZeroCek(cekCopy)

  const chunkedScheme = scheme as ChunkedAes256GcmStream
  const effectiveChunkSize = envelope.chunkSize ?? 262144
  const tagLength = 16
  const ciphertextChunkSize = effectiveChunkSize + tagLength

  if (!(blob instanceof Uint8Array)) {
    // Fetch only the ciphertext chunks we need
    const firstChunk = Math.floor(range.offset / effectiveChunkSize)
    const lastChunk = Math.min(
      Math.floor((range.offset + range.length - 1) / effectiveChunkSize),
      (envelope.chunkCount ?? 1) - 1
    )
    const ctStart = envelope.envelopeSize + firstChunk * ciphertextChunkSize
    const ctEnd =
      lastChunk === (envelope.chunkCount ?? 1) - 1
        ? undefined // fetch to end for last chunk (may be shorter)
        : envelope.envelopeSize + (lastChunk + 1) * ciphertextChunkSize

    const fetchLength = ctEnd !== undefined ? ctEnd - ctStart : (lastChunk - firstChunk + 1) * ciphertextChunkSize // overfetch last chunk is OK
    const fetched = await (blob as BlobFetcher).fetchRange(ctStart, fetchLength)

    // The fetched ciphertext starts at firstChunk, so adjust the plaintext offset
    // to be relative to the fetched data, and pass chunkIndexOffset so nonces use
    // global chunk indices.
    return chunkedScheme.decryptRange(
      key,
      fetched,
      envelope.iv,
      envelope.protectedHeaders,
      range.offset - firstChunk * effectiveChunkSize,
      range.length,
      effectiveChunkSize,
      envelope.chunkCount,
      firstChunk
    )
  }

  return chunkedScheme.decryptRange(
    key,
    ciphertext,
    envelope.iv,
    envelope.protectedHeaders,
    range.offset,
    range.length,
    envelope.chunkSize,
    envelope.chunkCount
  )
}

export function parseEnvelope(blob: Uint8Array): EnvelopeMetadata {
  let envelope: ReturnType<typeof decodeCoseEnvelope>
  try {
    envelope = decodeCoseEnvelope(blob)
  } catch (e) {
    if (e instanceof MalformedEnvelopeError) throw e
    throw new MalformedEnvelopeError('Failed to parse envelope')
  }

  const seekable = envelope.algorithm === CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM

  let appMetadata: AppMetadata | undefined
  if (envelope.appMetadata) {
    appMetadata = Object.fromEntries(envelope.appMetadata) as AppMetadata
  }

  return {
    algorithm: envelope.algorithm as CoseAlgorithmId,
    seekable,
    iv: envelope.iv,
    chunkSize: envelope.chunkSize,
    chunkCount: envelope.chunkCount,
    appMetadata,
    recipients: envelope.recipients,
    envelopeSize: envelope.envelopeSize,
  }
}
