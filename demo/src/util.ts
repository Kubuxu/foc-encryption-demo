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

const CHUNKED_THRESHOLD = 256 * 1024 // 256 KiB

export function autoSelectAlgorithm(fileSize: number): Pick<EncryptOptions, 'algorithm'> {
  if (fileSize > CHUNKED_THRESHOLD) {
    return { algorithm: CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM }
  }
  return { algorithm: CoseAlgorithm.AES_256_GCM }
}
