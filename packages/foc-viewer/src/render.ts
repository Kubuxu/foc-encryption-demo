import { filetypemime } from 'magic-bytes.js'

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

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

/**
 * Render decrypted content into the container based on its MIME type.
 * - HTML: replace full page DOM
 * - Images: centered <img> with download link
 * - PDF: <embed> viewer with download link
 * - Text: <pre> block with download link
 * - Binary/other: download only
 */
export function renderContent(container: HTMLElement, data: Uint8Array, contentType: string): void {
  if (contentType === 'text/html') {
    document.body.innerHTML = new TextDecoder().decode(data)
    return
  }

  const blob = new Blob([data as Uint8Array<ArrayBuffer>], { type: contentType })
  const objectUrl = URL.createObjectURL(blob)
  const filename = 'decrypted-content'

  if (contentType.startsWith('image/')) {
    container.innerHTML = `
      <div class="content-wrapper">
        <img src="${objectUrl}" alt="Decrypted image" style="max-width:100%;display:block;margin:0 auto;" />
        <a class="download-link" href="${objectUrl}" download="${escapeHtml(filename)}">Download image</a>
      </div>
    `
    return
  }

  if (contentType === 'application/pdf') {
    container.innerHTML = `
      <div class="content-wrapper">
        <embed src="${objectUrl}" type="application/pdf" width="100%" height="600px" />
        <a class="download-link" href="${objectUrl}" download="${escapeHtml(filename)}.pdf">Download PDF</a>
      </div>
    `
    return
  }

  if (contentType === 'text/plain') {
    const text = new TextDecoder().decode(data)
    container.innerHTML = `
      <div class="content-wrapper">
        <pre>${escapeHtml(text)}</pre>
        <a class="download-link" href="${objectUrl}" download="${escapeHtml(filename)}.txt">Download text</a>
      </div>
    `
    return
  }

  // Binary / unknown: download only
  container.innerHTML = `
    <div class="content-wrapper">
      <p>Content decrypted successfully (${escapeHtml(contentType)}).</p>
      <a class="download-link" href="${objectUrl}" download="${escapeHtml(filename)}">Download file</a>
    </div>
  `
}
