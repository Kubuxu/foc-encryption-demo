import { describe, it, expect } from 'vitest'
import { parseLocator } from '../../src/locator.js'

describe('parseLocator', () => {
  it('detects http:// URLs', () => {
    const locator = parseLocator('http://example.com/piece/baga123')
    expect(locator.kind).toBe('url')
    if (locator.kind === 'url') {
      expect(locator.url).toBe('http://example.com/piece/baga123')
    }
  })

  it('detects https:// URLs', () => {
    const locator = parseLocator('https://provider.example/piece/baga6ea4seaqabc')
    expect(locator.kind).toBe('url')
    if (locator.kind === 'url') {
      expect(locator.url).toBe('https://provider.example/piece/baga6ea4seaqabc')
    }
  })

  it('treats non-URL strings as PieceCID', () => {
    const locator = parseLocator('baga6ea4seaqabc123')
    expect(locator.kind).toBe('pieceCid')
    if (locator.kind === 'pieceCid') {
      expect(locator.pieceCid).toBe('baga6ea4seaqabc123')
    }
  })

  it('treats strings without protocol as PieceCID', () => {
    const locator = parseLocator('example.com/piece/baga123')
    expect(locator.kind).toBe('pieceCid')
  })

  it('treats ftp:// as PieceCID (not http/https)', () => {
    const locator = parseLocator('ftp://example.com/file')
    expect(locator.kind).toBe('pieceCid')
  })

  it('preserves the full URL including query string', () => {
    const url = 'https://provider.example/piece/baga123?token=abc'
    const locator = parseLocator(url)
    expect(locator.kind).toBe('url')
    if (locator.kind === 'url') {
      expect(locator.url).toBe(url)
    }
  })
})
