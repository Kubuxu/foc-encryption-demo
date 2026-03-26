import type { Recipient, RecipientInfo } from './types.js'

export function validateRecipients(recipients: Recipient[]): void {
  for (const r of recipients) {
    if (!r.wrappedKey || r.wrappedKey.length === 0) {
      throw new Error('Recipient must have a non-empty wrappedKey')
    }
  }
}

export type { Recipient, RecipientInfo }
