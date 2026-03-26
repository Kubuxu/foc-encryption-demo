import { readFile } from 'node:fs/promises'
import { encrypt, CoseAlgorithm, parseEnvelope } from 'foc-encryption'
import { parseKeySource, deriveKey } from '../key.js'
import { autoSelectAlgorithm, formatSize, formatUSDFC } from '../util.js'
import { createSynapseClient } from '../synapse.js'

export interface UploadFlags {
  file: string
  key?: string
  password?: string
  privateKey?: string
}

export async function uploadFile(flags: UploadFlags): Promise<void> {
  const privateKey = flags.privateKey ?? process.env.FOC_PRIVATE_KEY
  if (!privateKey) {
    throw new Error(
      'FOC_PRIVATE_KEY not set. Provide --private-key or set the environment variable.'
    )
  }

  const plaintext = new Uint8Array(await readFile(flags.file))
  const keySource = parseKeySource({ key: flags.key, password: flags.password })
  const derived = await deriveKey(keySource)

  const algOptions = autoSelectAlgorithm(plaintext.length)
  const isChunked = algOptions.algorithm === CoseAlgorithm.CHUNKED_AES_256_GCM_STREAM

  const appMetadata: Record<string, Uint8Array | string | number | boolean | undefined> = {}
  if (derived.salt) {
    appMetadata.pbkdf2_salt = derived.salt
    appMetadata.pbkdf2_iterations = 600_000
    appMetadata.pbkdf2_hash = 'SHA-256'
  }

  const hasMetadata = Object.keys(appMetadata).length > 0

  const blob = await encrypt(plaintext, derived.cek, {
    ...algOptions,
    appMetadata: hasMetadata ? appMetadata : undefined,
  })

  const synapse = createSynapseClient({ privateKey })

  console.log('Estimating costs...')
  const { costs, transaction } = await synapse.storage.prepare({ dataSize: BigInt(blob.length) })
  console.log(`  Per epoch (30s): ${formatUSDFC(costs.rate.perEpoch)}`)
  console.log(`  Per month:       ${formatUSDFC(costs.rate.perMonth)}`)
  console.log(`  Deposit needed:  ${formatUSDFC(costs.depositNeeded)}`)
  console.log(`  Ready:           ${costs.ready}`)

  if (transaction) {
    console.log(`  Deposit amount:      ${formatUSDFC(transaction.depositAmount)}`)
    console.log(`  Includes approval:   ${transaction.includesApproval}`)
    const { hash } = await transaction.execute({
      onHash: (h) => console.log(`  Transaction hash: ${h}`),
    })
    console.log(`  Transaction confirmed: ${hash}`)
  }

  const PROGRESS_CHUNK_SIZE = 1024 * 1024 // report every 1 MiB
  let lastReportedBytes = 0

  console.log('Uploading to Filecoin Calibration...')
  const result = await synapse.storage.upload(blob, {
    callbacks: {
      onProviderSelected: (provider) => {
        console.log(`  Selected SP ${provider.id} (${provider.serviceProvider})`)
      },
      onDataSetResolved: (info) => {
        console.log(`  Data set: ${info.dataSetId}`)
      },
      onProgress: (bytesUploaded) => {
        if (bytesUploaded - lastReportedBytes >= PROGRESS_CHUNK_SIZE || bytesUploaded === blob.length) {
          const pct = blob.length > 0 ? ` (${((bytesUploaded / blob.length) * 100).toFixed(1)}%)` : ''
          console.log(`  Upload progress: ${formatSize(bytesUploaded)}${pct}`)
          lastReportedBytes = bytesUploaded
        }
      },
      onStored: (providerId, pieceCid) => {
        console.log(`  Stored on SP ${providerId}: ${pieceCid}`)
      },
      onPiecesAdded: (transaction, providerId, pieces) => {
        console.log(`  Pieces committed on SP ${providerId}, tx: ${transaction}`)
        for (const { pieceCid } of pieces) {
          console.log(`    ${pieceCid}`)
        }
      },
      onPiecesConfirmed: (dataSetId, providerId, pieces) => {
        console.log(`  Data set ${dataSetId} confirmed on SP ${providerId}`)
        for (const { pieceCid, pieceId } of pieces) {
          console.log(`    ${pieceCid} -> pieceId ${pieceId}`)
        }
      },
      onPullProgress: (providerId, pieceCid, status) => {
        console.log(`  Pulling to SP ${providerId}: ${pieceCid} (${status})`)
      },
      onCopyComplete: (providerId, pieceCid) => {
        console.log(`  Copied to SP ${providerId}: ${pieceCid}`)
      },
      onCopyFailed: (providerId, pieceCid, error) => {
        console.log(`  Copy failed on SP ${providerId}: ${pieceCid} - ${error.message}`)
      },
    },
  })

  const algorithmName = isChunked ? 'Chunked-AES-256-GCM-STREAM' : 'AES-256-GCM'
  console.log(`PieceCID:       ${result.pieceCid.toString()}`)
  if (result.copies.length > 0) {
    console.log(`Retrieval URL:  ${result.copies[0].retrievalUrl}`)
  }
  console.log(`Algorithm:      ${algorithmName}`)
  console.log(`Plaintext size: ${formatSize(plaintext.length)}`)
  console.log(`Blob size:      ${formatSize(blob.length)}`)
  if (isChunked) {
    const meta = parseEnvelope(blob)
    if (meta.chunkCount !== undefined) {
      console.log(`Chunk count:    ${meta.chunkCount}`)
    }
  }
}
