import type { EncryptOptions } from 'foc-encryption'
import { CoseAlgorithm } from 'foc-encryption'

export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message
  }
  return String(err)
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// USDFC uses 18 decimals (attoUSDFC) like other EVM tokens on Filecoin
const USDFC_SCALE = 10n ** 18n
const USDFC_DISPLAY_DECIMALS = 6

export function formatUSDFC(amount: bigint): string {
  const whole = amount / USDFC_SCALE
  const frac = amount % USDFC_SCALE
  const fracStr = frac.toString().padStart(18, '0').slice(0, USDFC_DISPLAY_DECIMALS)
  return `${whole}.${fracStr} USDFC`
}

const CHUNKED_THRESHOLD = 256 * 1024 // 256 KiB

export function autoSelectAlgorithm(fileSize: number): Pick<EncryptOptions, 'algorithm'> {
  if (fileSize > CHUNKED_THRESHOLD) {
    return { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM }
  }
  return { algorithm: CoseAlgorithm.AES_256_GCM }
}
