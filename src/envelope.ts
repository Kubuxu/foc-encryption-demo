import type { CEKBytes, EncryptOptions, Recipient } from './types.ts'
import { validateCek, importAndZeroCek } from './key-utils.ts'
import { CoseAlgorithm } from './cose/headers.ts'
import { encodeCoseEncrypt0, encodeCoseEncrypt, getProtectedHeaderBytes } from './cose/encode.ts'
import { decodeCoseEnvelope } from './cose/decode.ts'
import { Aes256Gcm } from './schemes/aes-256-gcm.ts'
import { assembleBlob, parseBlob } from './blob.ts'
import { UnsupportedSchemeError } from './errors.ts'
import type { EncryptionScheme } from './schemes/scheme.ts'

function getScheme(algorithmId: number): EncryptionScheme {
  switch (algorithmId) {
    case CoseAlgorithm.AES_256_GCM:
      return new Aes256Gcm()
    default:
      throw new UnsupportedSchemeError(algorithmId)
  }
}

export async function encrypt(
  plaintext: Uint8Array,
  cek: CEKBytes,
  options: EncryptOptions,
  recipients?: Recipient[],
): Promise<Uint8Array> {
  validateCek(cek)
  const scheme = getScheme(options.algorithm)
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

  const scheme = getScheme(envelope.algorithm)

  const cekCopy = new Uint8Array(cek)
  const key = await importAndZeroCek(cekCopy)

  return scheme.decrypt(key, parsed.ciphertext, envelope.iv, envelope.protectedHeaders)
}
