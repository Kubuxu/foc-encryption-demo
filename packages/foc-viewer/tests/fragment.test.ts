import { describe, expect, it } from 'vitest'
import { buildFragment, parseFragment } from '../src/fragment.js'

describe('parseFragment', () => {
  it('parses url and password', () => {
    const result = parseFragment('#url=https%3A%2F%2Fexample.com%2Fblob&pw=secret')
    expect(result).toEqual({ url: 'https://example.com/blob', password: 'secret' })
  })

  it('parses url without password', () => {
    const result = parseFragment('#url=https%3A%2F%2Fexample.com%2Fblob')
    expect(result).toEqual({ url: 'https://example.com/blob', password: undefined })
  })

  it('returns null for empty hash', () => {
    expect(parseFragment('')).toBeNull()
    expect(parseFragment('#')).toBeNull()
  })

  it('returns null when url param is missing', () => {
    expect(parseFragment('#pw=secret')).toBeNull()
    expect(parseFragment('#foo=bar')).toBeNull()
  })

  it('handles special characters in url', () => {
    const url = 'https://example.com/path?q=1&r=2'
    const hash = '#url=' + encodeURIComponent(url)
    const result = parseFragment(hash)
    expect(result?.url).toBe(url)
  })

  it('handles special characters in password', () => {
    const password = 'p@ss w0rd! #$%'
    const hash = '#url=https%3A%2F%2Fex.com&pw=' + encodeURIComponent(password)
    const result = parseFragment(hash)
    expect(result?.password).toBe(password)
  })

  it('handles hash without leading #', () => {
    const result = parseFragment('url=https%3A%2F%2Fexample.com')
    expect(result?.url).toBe('https://example.com')
  })
})

describe('buildFragment', () => {
  it('builds fragment with url and password', () => {
    const fragment = buildFragment({ url: 'https://example.com/blob', password: 'secret' })
    expect(fragment).toMatch(/^#/)
    const parsed = parseFragment(fragment)
    expect(parsed).toEqual({ url: 'https://example.com/blob', password: 'secret' })
  })

  it('builds fragment with url only', () => {
    const fragment = buildFragment({ url: 'https://example.com/blob' })
    expect(fragment).toMatch(/^#/)
    const parsed = parseFragment(fragment)
    expect(parsed).toEqual({ url: 'https://example.com/blob', password: undefined })
  })

  it('round-trips url with special characters', () => {
    const url = 'https://example.com/path?q=1&r=2'
    const fragment = buildFragment({ url })
    const parsed = parseFragment(fragment)
    expect(parsed?.url).toBe(url)
  })

  it('round-trips password with special characters', () => {
    const password = 'p@ss w0rd! #$%'
    const fragment = buildFragment({ url: 'https://ex.com', password })
    const parsed = parseFragment(fragment)
    expect(parsed?.password).toBe(password)
  })

  it('does not include pw param when password is undefined', () => {
    const fragment = buildFragment({ url: 'https://ex.com' })
    expect(fragment).not.toContain('pw=')
  })
})
