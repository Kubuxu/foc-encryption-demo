import * as cborg from 'cborg'
import { describe, expect, it } from 'vitest'
import { COSE_HEADER_ALG, COSE_HEADER_TYP, CoseAlgorithm, FOC_ENVELOPE_TYPE } from '../../src/cose/headers.js'
import { coseDecodeOptions } from '../../src/cose/tags.js'
import { decrypt, encrypt } from '../../src/envelope.js'
import { AuthenticationError } from '../../src/errors.js'

const decodeOpts = coseDecodeOptions

describe('encrypt integration', () => {
  it('produces a valid encrypted blob', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('Hello, Filecoin!')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })

    expect(blob).toBeInstanceOf(Uint8Array)
    expect(blob.length).toBeGreaterThan(plaintext.length)
  })

  it('blob starts with valid COSE_Encrypt0 (CBOR tag 16)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('test data')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const [decoded, remainder] = cborg.decodeFirst(blob, decodeOpts)

    expect(decoded.tag).toBe(16)
    const arr = decoded.value as [Uint8Array, Map<number, unknown>, null]
    expect(arr).toHaveLength(3)

    const protectedMap = cborg.decode(arr[0], { useMaps: true }) as Map<number, unknown>
    expect(protectedMap.get(COSE_HEADER_ALG)).toBe(3)
    expect(protectedMap.get(COSE_HEADER_TYP)).toBe(FOC_ENVELOPE_TYPE)

    expect(remainder.length).toBe(plaintext.length + 16)
  })

  it('ciphertext differs from plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(64).fill(0x42)

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const [, remainder] = cborg.decodeFirst(blob, decodeOpts)

    const ctPrefix = remainder.slice(0, plaintext.length)
    expect(ctPrefix).not.toEqual(plaintext)
  })

  it('two encryptions produce different ciphertexts (unique nonces)', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('same data')

    const blob1 = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const blob2 = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })

    expect(blob1).not.toEqual(blob2)
  })
})

describe('decrypt integration', () => {
  it('round-trip: encrypt then decrypt returns original plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('Hello, Filecoin!')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })

  it('round-trip with empty plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(0)

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })

  it('round-trip with 1 byte plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array([0x42])

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })

  it('round-trip with 1 KiB plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = crypto.getRandomValues(new Uint8Array(1024))

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })

  it('round-trip with 1 MiB plaintext', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new Uint8Array(1024 * 1024)
    for (let i = 0; i < plaintext.length; i += 65536) {
      crypto.getRandomValues(plaintext.subarray(i, Math.min(i + 65536, plaintext.length)))
    }

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })
    const decrypted = await decrypt(blob, cek)

    expect(decrypted).toEqual(plaintext)
  })

  it('wrong key throws AuthenticationError', async () => {
    const cek1 = crypto.getRandomValues(new Uint8Array(32))
    const cek2 = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('secret')

    const blob = await encrypt(plaintext, cek1, { algorithm: CoseAlgorithm.AES_256_GCM })

    await expect(decrypt(blob, cek2)).rejects.toThrow(AuthenticationError)
  })

  it('tampered blob throws AuthenticationError', async () => {
    const cek = crypto.getRandomValues(new Uint8Array(32))
    const plaintext = new TextEncoder().encode('tamper test')

    const blob = await encrypt(plaintext, cek, { algorithm: CoseAlgorithm.AES_256_GCM })

    // Flip a byte at the end (in the ciphertext portion)
    const tampered = new Uint8Array(blob)
    tampered[tampered.length - 1] ^= 0xff

    await expect(decrypt(tampered, cek)).rejects.toThrow(AuthenticationError)
  })
})
