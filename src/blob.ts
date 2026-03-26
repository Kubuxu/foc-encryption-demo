import * as cborg from 'cborg'
import { coseDecodeOptions } from './cose/tags.js'

export function assembleBlob(envelope: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const blob = new Uint8Array(envelope.length + ciphertext.length)
  blob.set(envelope, 0)
  blob.set(ciphertext, envelope.length)
  return blob
}

export interface ParsedBlob {
  envelopeBytes: Uint8Array
  envelopeValue: unknown
  ciphertext: Uint8Array
}

export function parseBlob(blob: Uint8Array): ParsedBlob {
  const [value, remainder] = cborg.decodeFirst(blob, coseDecodeOptions)
  const envelopeSize = blob.length - remainder.length
  return {
    envelopeBytes: blob.slice(0, envelopeSize),
    envelopeValue: value,
    ciphertext: remainder,
  }
}
