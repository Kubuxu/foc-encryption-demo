import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { COSE_HEADER_ALG, COSE_HEADER_TYP, CoseAlgorithm, FOC_ENVELOPE_TYPE } from '../../src/cose/headers.js'
import { coseDecodeOptions } from '../../src/cose/tags.js'
import { encrypt } from '../../src/envelope.js'
import type { Recipient } from '../../src/types.js'

describe('COSE interoperability (SC-004)', () => {
  it('COSE_Encrypt0 envelope is valid COSE parseable by cborg', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('interop test')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })

    // Parse with cborg independently
    const [tagged, remainder] = cborg.decodeFirst(blob, coseDecodeOptions)
    expect(tagged.tag).toBe(16)

    const arr = tagged.value as unknown[]
    expect(arr).toHaveLength(3)

    // Verify CBOR tag 16 (COSE_Encrypt0)
    expect(arr[2]).toBeNull() // detached payload

    // Protected header round-trip
    const protectedMap = cborg.decode(arr[0] as Uint8Array, { useMaps: true }) as Map<number, unknown>
    expect(protectedMap.get(COSE_HEADER_ALG)).toBe(3)
    expect(protectedMap.get(COSE_HEADER_TYP)).toBe(FOC_ENVELOPE_TYPE)

    expect(remainder.length).toBeGreaterThan(0) // ciphertext follows
  })

  it('COSE_Encrypt envelope is valid COSE parseable by cborg', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('interop test')
    const recipients: Recipient[] = [
      { algorithm: -3, keyId: new TextEncoder().encode('test'), wrappedKey: new Uint8Array([1, 2, 3]) },
    ]

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM }, recipients)

    const [tagged, remainder] = cborg.decodeFirst(blob, coseDecodeOptions)
    expect(tagged.tag).toBe(96)

    const arr = tagged.value as unknown[]
    expect(arr).toHaveLength(4)
    expect(arr[2]).toBeNull()

    // Protected header round-trip
    const protectedMap = cborg.decode(arr[0] as Uint8Array, { useMaps: true }) as Map<number, unknown>
    expect(protectedMap.get(COSE_HEADER_ALG)).toBe(3)
    expect(protectedMap.get(COSE_HEADER_TYP)).toBe(FOC_ENVELOPE_TYPE)

    // Recipients array
    const recipientArr = arr[3] as unknown[][]
    expect(recipientArr).toHaveLength(1)

    expect(remainder.length).toBeGreaterThan(0)
  })
})
