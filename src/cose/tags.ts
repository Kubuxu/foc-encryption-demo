export const COSE_TAG_ENCRYPT0 = 16
export const COSE_TAG_ENCRYPT = 96

export interface CborTagged<T = unknown> {
  tag: number
  value: T
}

function makeTagged(tag: number, value: unknown): CborTagged {
  return { tag, value }
}

export const coseTagDecoders: Record<number, (value: unknown) => CborTagged> = {
  [COSE_TAG_ENCRYPT0]: (value) => makeTagged(COSE_TAG_ENCRYPT0, value),
  [COSE_TAG_ENCRYPT]: (value) => makeTagged(COSE_TAG_ENCRYPT, value),
}

/** Standard decode options for COSE structures: integer map keys + COSE tags */
export const coseDecodeOptions = {
  tags: coseTagDecoders,
  useMaps: true,
}
