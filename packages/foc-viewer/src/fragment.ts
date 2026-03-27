export interface FragmentParams {
  url: string
  password?: string
}

/** Parse URL fragment into structured params. Returns null if no `url` param found. */
export function parseFragment(hash: string): FragmentParams | null {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash
  if (!raw) return null
  const params = new URLSearchParams(raw)
  const url = params.get('url')
  if (!url) return null
  const pw = params.get('pw')
  return { url, password: pw ?? undefined }
}

/** Build a URL fragment string from params. */
export function buildFragment(params: FragmentParams): string {
  const p = new URLSearchParams()
  p.set('url', params.url)
  if (params.password !== undefined) {
    p.set('pw', params.password)
  }
  return '#' + p.toString()
}
