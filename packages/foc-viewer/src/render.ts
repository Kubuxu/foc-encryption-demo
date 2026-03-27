import { filetypemime } from 'magic-bytes.js'

/**
 * Detect MIME type of decrypted data using magic bytes.
 * Falls back to HTML/text/binary heuristics for formats magic-bytes.js doesn't cover.
 */
export async function detectContentType(data: Uint8Array): Promise<string> {
  // magic-bytes.js detects binary formats (PNG, JPEG, GIF, WebP, PDF, etc.)
  const mimes = filetypemime(Array.from(data.slice(0, 100)))
  if (mimes.length > 0) {
    return mimes[0]
  }

  // Check for HTML markers (not binary, so magic-bytes won't detect)
  const prefix = new TextDecoder().decode(data.slice(0, 15)).trimStart().toLowerCase()
  if (prefix.startsWith('<!doctype') || prefix.startsWith('<html')) {
    return 'text/html'
  }

  // Check if valid UTF-8 text
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(data)
    return 'text/plain'
  } catch {
    return 'application/octet-stream'
  }
}
