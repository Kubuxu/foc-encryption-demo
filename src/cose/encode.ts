import * as cborg from 'cborg'
import type { AppMetadata, Recipient } from '../types.ts'
import {
  COSE_HEADER_ALG,
  COSE_HEADER_IV,
  COSE_HEADER_KID,
  COSE_HEADER_TYP,
  CoseHeaderParam,
  FOC_ENVELOPE_TYPE,
} from './headers.ts'

interface EncodeOptions {
  appMetadata?: AppMetadata
  chunkSize?: number
  chunkCount?: number
}

function encodeCborTag(tag: number, value: unknown): Uint8Array {
  const valueBytes = cborg.encode(value)
  let tagBytes: Uint8Array

  if (tag < 24) {
    tagBytes = new Uint8Array([0xc0 | tag])
  } else if (tag < 256) {
    tagBytes = new Uint8Array([0xd8, tag])
  } else if (tag < 65536) {
    tagBytes = new Uint8Array([0xd9, (tag >> 8) & 0xff, tag & 0xff])
  } else {
    tagBytes = new Uint8Array([0xda, (tag >> 24) & 0xff, (tag >> 16) & 0xff, (tag >> 8) & 0xff, tag & 0xff])
  }

  const result = new Uint8Array(tagBytes.length + valueBytes.length)
  result.set(tagBytes, 0)
  result.set(valueBytes, tagBytes.length)
  return result
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
