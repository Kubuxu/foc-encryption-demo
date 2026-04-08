import { type DecodeOptions, Tagged } from 'cborg'

export const COSE_TAG_ENCRYPT0 = 16
export const COSE_TAG_ENCRYPT = 96

/** Standard decode options for COSE structures: integer map keys + COSE tags round-tripped as `Tagged`. */
export const coseDecodeOptions: DecodeOptions = {
  tags: Tagged.preserve(COSE_TAG_ENCRYPT0, COSE_TAG_ENCRYPT),
  useMaps: true,
}
