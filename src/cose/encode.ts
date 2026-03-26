import * as cborg from 'cborg'
import type { AppMetadata, Recipient } from '../types.js'
import {
  COSE_HEADER_ALG,
  COSE_HEADER_IV,
  COSE_HEADER_KID,
  COSE_HEADER_TYP,
  CoseHeaderParam,
  FOC_ENVELOPE_TYPE,
} from './headers.js'

interface EncodeOptions {
  appMetadata?: AppMetadata
  chunkSize?: number
  chunkCount?: number
}

/**
 * Encode a CBOR tagged value. cborg doesn't expose a Tagged class for encoding,
 * so we prepend the CBOR tag header bytes to the encoded value.
 * Tag header format per RFC 8949 §3.1: major type 6 (0xc0) + tag number.
 */
function encodeCborTag(tag: number, value: unknown): Uint8Array {
  const valueBytes = cborg.encode(value)
  const tagHeader = encodeCborTagHeader(tag)
  const result = new Uint8Array(tagHeader.length + valueBytes.length)
  result.set(tagHeader, 0)
  result.set(valueBytes, tagHeader.length)
  return result
}

function encodeCborTagHeader(tag: number): Uint8Array {
  if (tag < 24) return new Uint8Array([0xc0 | tag])
  if (tag < 0x100) return new Uint8Array([0xd8, tag])
  if (tag < 0x10000) return new Uint8Array([0xd9, (tag >> 8) & 0xff, tag & 0xff])
  return new Uint8Array([0xda, (tag >> 24) & 0xff, (tag >> 16) & 0xff, (tag >> 8) & 0xff, tag & 0xff])
}

function buildUnprotectedMap(iv: Uint8Array, options?: EncodeOptions): Map<number, unknown> {
  const unprotectedMap = new Map<number, unknown>([[COSE_HEADER_IV, iv]])

  if (options?.chunkSize !== undefined) {
    unprotectedMap.set(CoseHeaderParam.CHUNK_SIZE, options.chunkSize)
  }
  if (options?.chunkCount !== undefined) {
    unprotectedMap.set(CoseHeaderParam.CHUNK_COUNT, options.chunkCount)
  }
  if (options?.appMetadata) {
    unprotectedMap.set(CoseHeaderParam.APP_METADATA, encodeAppMetadata(options.appMetadata))
  }

  return unprotectedMap
}

export function encodeCoseEncrypt0(algorithmId: number, iv: Uint8Array, options?: EncodeOptions): Uint8Array {
  const protectedBytes = getProtectedHeaderBytes(algorithmId)
  const unprotectedMap = buildUnprotectedMap(iv, options)
  return encodeCborTag(16, [protectedBytes, unprotectedMap, null])
}

export function encodeCoseEncrypt(
  algorithmId: number,
  iv: Uint8Array,
  recipients: Recipient[],
  options?: EncodeOptions
): Uint8Array {
  const protectedBytes = getProtectedHeaderBytes(algorithmId)
  const unprotectedMap = buildUnprotectedMap(iv, options)

  const recipientStructures = recipients.map((r) => {
    const rProtected = cborg.encode(new Map<number, unknown>([[COSE_HEADER_ALG, r.algorithm]]))
    const rUnprotected = new Map<number, unknown>()
    if (r.keyId) {
      rUnprotected.set(COSE_HEADER_KID, r.keyId)
    }
    if (r.unprotectedHeaders) {
      for (const [k, v] of r.unprotectedHeaders) {
        rUnprotected.set(k, v)
      }
    }
    return [rProtected, rUnprotected, r.wrappedKey]
  })

  return encodeCborTag(96, [protectedBytes, unprotectedMap, null, recipientStructures])
}

export function getProtectedHeaderBytes(algorithmId: number): Uint8Array {
  const protectedMap = new Map<number, unknown>([
    [COSE_HEADER_ALG, algorithmId],
    [COSE_HEADER_TYP, FOC_ENVELOPE_TYPE],
  ])
  return cborg.encode(protectedMap)
}

function encodeAppMetadata(meta: AppMetadata): Map<string, unknown> {
  const map = new Map<string, unknown>()
  for (const [key, value] of Object.entries(meta)) {
    if (value !== undefined) {
      map.set(key, value)
    }
  }
  return map
}
