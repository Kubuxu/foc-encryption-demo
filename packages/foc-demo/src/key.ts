import { type DerivedKey, type KeySource, deriveKey } from 'foc-encryption'

export type { KeySource, DerivedKey }
export { deriveKey }

export function parseKeySource(flags: { key?: string; password?: string }): KeySource {
  if (flags.key && flags.password) {
    throw new Error('Provide either --password or --key, not both')
  }
  if (flags.key) {
    return { kind: 'hex', hex: flags.key }
  }
  if (flags.password) {
    return { kind: 'password', password: flags.password }
  }
  throw new Error('Provide either --password or --key')
}
