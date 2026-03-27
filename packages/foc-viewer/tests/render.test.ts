import { describe, expect, it } from 'vitest'
import { detectContentType } from '../src/render.js'

function bytes(...values: number[]): Uint8Array {
  return new Uint8Array(values)
}

describe('detectContentType', () => {
  it('detects PNG from magic bytes', async () => {
    const data = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00)
    expect(await detectContentType(data)).toBe('image/png')
  })

  it('detects JPEG from magic bytes', async () => {
    const data = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46)
    expect(await detectContentType(data)).toBe('image/jpeg')
  })

  it('detects GIF from magic bytes', async () => {
    const data = bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00)
    expect(await detectContentType(data)).toBe('image/gif')
  })

  it('detects WebP from magic bytes', async () => {
    // RIFF....WEBP
    const data = bytes(
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // file size (placeholder)
      0x57, 0x45, 0x42, 0x50  // WEBP
    )
    expect(await detectContentType(data)).toBe('image/webp')
  })

  it('detects PDF from magic bytes', async () => {
    const data = bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e) // %PDF-1.
    expect(await detectContentType(data)).toBe('application/pdf')
  })

  it('detects HTML with <!DOCTYPE prefix', async () => {
    const html = '<!DOCTYPE html><html><body>hi</body></html>'
    const data = new TextEncoder().encode(html)
    expect(await detectContentType(data)).toBe('text/html')
  })

  it('detects HTML with <html prefix', async () => {
    const html = '<html><body>hello</body></html>'
    const data = new TextEncoder().encode(html)
    expect(await detectContentType(data)).toBe('text/html')
  })

  it('detects plain text for valid UTF-8 text', async () => {
    const data = new TextEncoder().encode('Hello, world! This is plain text.')
    expect(await detectContentType(data)).toBe('text/plain')
  })

  it('falls back to application/octet-stream for binary data', async () => {
    // Bytes that are not valid UTF-8 and not a known format
    const data = bytes(0x00, 0x01, 0x02, 0xfe, 0xff, 0x80, 0x81, 0x82, 0x83)
    expect(await detectContentType(data)).toBe('application/octet-stream')
  })
})
