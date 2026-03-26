export const CoseAlgorithm = {
  AES_256_GCM: 3,
  CHUNKED_AES_256_GCM_STREAM: -65793,
} as const

export const CoseHeaderParam = {
  CHUNK_SIZE: -65790,
  CHUNK_COUNT: -65791,
  APP_METADATA: -65792,
} as const

// Standard COSE header labels
export const COSE_HEADER_ALG = 1
export const COSE_HEADER_KID = 4
export const COSE_HEADER_IV = 5
export const COSE_HEADER_TYP = 16

export const FOC_ENVELOPE_TYPE = 'application/vnd.foc-envelope+cose'
