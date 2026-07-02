import { describe, expect, it } from 'vitest'
import { parseBlob } from '../../src/blob.js'
import { CoseAlgorithm } from '../../src/cose/headers.js'
import { buildEncStructure } from '../../src/cose/structures.js'
import { aesGcmDecrypt, importAesGcmKey } from '../../src/crypto.js'
import { encrypt, parseEnvelope } from '../../src/envelope.js'
import { deriveChunkNonce } from '../../src/schemes/chunked-aes-256-gcm.js'
import type { Recipient } from '../../src/types.js'

// Independently open the (single) body chunk with a chosen Enc_structure context,
// to observe which context the envelope's body was actually sealed under.
async function openChunk0(blob: Uint8Array, cek: Uint8Array, context: 'Encrypt' | 'Encrypt0') {
  const meta = parseEnvelope(blob)
  const { ciphertext } = parseBlob(blob)
  const key = await importAesGcmKey(cek)
  const nonce = deriveChunkNonce(meta.iv, 0, true) // single chunk => index 0, final
  const aad = buildEncStructure(context, meta.protectedHeaders, new Uint8Array(0))
  return aesGcmDecrypt(key, nonce, ciphertext, aad)
}

// Regression test for the Enc_structure context bug: the body AEAD must
// authenticate the RFC 9052 Section 5.3 context that matches the envelope
// structure carrying it — "Encrypt" for tag 96, "Encrypt0" for tag 16. Before
// the fix the schemes hardcoded "Encrypt0" for both, so the first assertion of
// the tag-96 case fails.
describe('body AAD context matches the envelope structure (RFC 9052 Section 5.3)', () => {
  const cek = new Uint8Array(32).fill(7)
  const message = 'domain separation matters'
  const plaintext = new TextEncoder().encode(message)
  const opts = { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM, chunkSize: 4096 } as const

  it('tag 96 (COSE_Encrypt, with recipients) binds the body to the "Encrypt" context', async () => {
    const recipients: Recipient[] = [
      { algorithm: -5, keyId: new TextEncoder().encode('kid'), wrappedKey: new Uint8Array([1, 2, 3, 4]) },
    ]
    const blob = await encrypt(plaintext, cek, opts, recipients)

    const opened = await openChunk0(blob, cek, 'Encrypt')
    expect(new TextDecoder().decode(opened)).toBe(message)

    await expect(openChunk0(blob, cek, 'Encrypt0')).rejects.toThrow()
  })

  it('tag 16 (COSE_Encrypt0, no recipients) binds the body to the "Encrypt0" context', async () => {
    const blob = await encrypt(plaintext, cek, opts)

    const opened = await openChunk0(blob, cek, 'Encrypt0')
    expect(new TextDecoder().decode(opened)).toBe(message)

    await expect(openChunk0(blob, cek, 'Encrypt')).rejects.toThrow()
  })
})
