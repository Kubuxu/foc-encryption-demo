export type CEKBytes = Uint8Array

export interface ByteRange {
  offset: number
  length: number
}

export interface SimpleEncryptOptions {
  algorithm: 3
  appMetadata?: AppMetadata
}

export interface ChunkedEncryptOptions {
  algorithm: -65793
  chunkSize?: number
  appMetadata?: AppMetadata
}

export type EncryptOptions = SimpleEncryptOptions | ChunkedEncryptOptions

export interface AppMetadata {
  cid?: Uint8Array
  [key: string]: Uint8Array | string | number | boolean | undefined
}

export type CoseEnvelopeTag = 16 | 96

export interface EnvelopeMetadata {
  tag: CoseEnvelopeTag
  algorithm: CoseAlgorithmId
  seekable: boolean
  iv: Uint8Array
  protectedHeaders: Uint8Array
  chunkSize?: number
  chunkCount?: number
  appMetadata?: AppMetadata
  recipients: RecipientInfo[]
  envelopeSize: number
}

export interface RecipientInfo {
  algorithm: number
  keyId?: Uint8Array
  wrappedKey?: Uint8Array
}

export interface Recipient {
  algorithm: number
  keyId?: Uint8Array
  wrappedKey: Uint8Array
  unprotectedHeaders?: Map<number, unknown>
}

export interface BlobFetcher {
  fetchEnvelope(): Promise<Uint8Array>
  fetchRange(offset: number, length: number): Promise<Uint8Array>
}

export type CoseAlgorithmId = 3 | -65793
