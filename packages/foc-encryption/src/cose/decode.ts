import { Tagged, decode, decodeFirst } from 'cborg'
import { MalformedEnvelopeError } from '../errors.js'
import type { RecipientInfo } from '../types.js'
import { COSE_HEADER_ALG, COSE_HEADER_IV, COSE_HEADER_KID, CoseHeaderParam } from './headers.js'
import { COSE_TAG_ENCRYPT, COSE_TAG_ENCRYPT0, coseDecodeOptions } from './tags.js'

export interface DecodedEnvelope {
  tag: number
  algorithm: number
  iv: Uint8Array
  protectedHeaders: Uint8Array
  chunkSize?: number
  chunkCount?: number
  appMetadata?: Map<string, unknown>
  recipients: RecipientInfo[]
  envelopeSize: number
}

export function decodeCoseEnvelope(blob: Uint8Array): DecodedEnvelope {
  let decoded: unknown
  let remainder: Uint8Array
  try {
    ;[decoded, remainder] = decodeFirst(blob, coseDecodeOptions)
  } catch (err) {
    throw new MalformedEnvelopeError('Failed to decode COSE envelope: invalid CBOR', { cause: err })
  }

  if (!(decoded instanceof Tagged)) {
    throw new MalformedEnvelopeError('Expected a CBOR-tagged COSE envelope')
  }
  if (decoded.tag !== COSE_TAG_ENCRYPT0 && decoded.tag !== COSE_TAG_ENCRYPT) {
    throw new MalformedEnvelopeError(`Expected COSE_Encrypt0 (tag 16) or COSE_Encrypt (tag 96), got tag ${decoded.tag}`)
  }

  const arr = decoded.value as unknown[]
  if (!Array.isArray(arr) || arr.length < 3) {
    throw new MalformedEnvelopeError('COSE envelope must be an array of at least 3 elements')
  }

  const protectedBytes = arr[0] as Uint8Array
  const unprotectedMap = arr[1] as Map<number, unknown>

  let protectedMap: Map<number, unknown>
  try {
    protectedMap = decode(protectedBytes, { useMaps: true }) as Map<number, unknown>
  } catch (err) {
    throw new MalformedEnvelopeError('Failed to decode protected headers', { cause: err })
  }

  const algorithm = protectedMap.get(COSE_HEADER_ALG)
  if (typeof algorithm !== 'number') {
    throw new MalformedEnvelopeError('Missing or invalid algorithm in protected headers')
  }

  const iv = unprotectedMap.get(COSE_HEADER_IV) as Uint8Array | undefined
  if (!iv) {
    throw new MalformedEnvelopeError('Missing IV in unprotected headers')
  }

  const chunkSize = unprotectedMap.get(CoseHeaderParam.CHUNK_SIZE) as number | undefined
  const chunkCount = unprotectedMap.get(CoseHeaderParam.CHUNK_COUNT) as number | undefined
  const appMetadata = unprotectedMap.get(CoseHeaderParam.APP_METADATA) as Map<string, unknown> | undefined

  let recipients: RecipientInfo[] = []
  if (decoded.tag === COSE_TAG_ENCRYPT && arr.length >= 4) {
    const recipientArr = arr[3] as unknown[][]
    if (Array.isArray(recipientArr)) {
      recipients = recipientArr.map(parseRecipient)
    }
  }

  const envelopeSize = blob.length - remainder.length

  return {
    tag: decoded.tag,
    algorithm,
    iv,
    protectedHeaders: protectedBytes,
    chunkSize,
    chunkCount,
    appMetadata,
    recipients,
    envelopeSize,
  }
}

function parseRecipient(arr: unknown[]): RecipientInfo {
  const rProtectedBytes = arr[0] as Uint8Array
  const rUnprotected = arr[1] as Map<number, unknown>
  const wrappedKey = arr[2] as Uint8Array | undefined

  let rProtected: Map<number, unknown>
  try {
    rProtected = decode(rProtectedBytes, { useMaps: true }) as Map<number, unknown>
  } catch {
    rProtected = new Map()
  }

  const algorithm = rProtected.get(COSE_HEADER_ALG) as number
  const keyId = rUnprotected.get(COSE_HEADER_KID) as Uint8Array | undefined

  return {
    algorithm,
    keyId,
    wrappedKey: wrappedKey && wrappedKey.length > 0 ? wrappedKey : undefined,
  }
}
