#!/usr/bin/env node
import { cli, command } from 'cleye'
import { decryptFile } from './commands/decrypt.js'
import { downloadFile } from './commands/download.js'
import { encryptFile } from './commands/encrypt.js'
import { rangeDecrypt } from './commands/range.js'
import { uploadFile } from './commands/upload.js'

const encryptCommand = command(
  {
    name: 'encrypt',
    help: {
      description: 'Encrypt a local file without uploading',
    },
    parameters: ['<file>'],
    flags: {
      password: {
        type: String,
        alias: 'p',
        description: 'Encryption password (PBKDF2)',
      },
      key: {
        type: String,
        alias: 'k',
        description: 'Hex-encoded 256-bit key',
      },
      output: {
        type: String,
        alias: 'o',
        description: 'Output file path (default: <file>.enc)',
      },
    },
  },
  async (argv) => {
    try {
      await encryptFile({
        file: argv._.file,
        key: argv.flags.key,
        password: argv.flags.password,
        output: argv.flags.output,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
)

const decryptCommand = command(
  {
    name: 'decrypt',
    help: {
      description: 'Decrypt a local encrypted blob',
    },
    parameters: ['<file>'],
    flags: {
      password: {
        type: String,
        alias: 'p',
        description: 'Decryption password',
      },
      key: {
        type: String,
        alias: 'k',
        description: 'Hex-encoded 256-bit key',
      },
      output: {
        type: String,
        alias: 'o',
        description: 'Output file path (default: <file> minus .enc suffix)',
      },
    },
  },
  async (argv) => {
    try {
      await decryptFile({
        file: argv._.file,
        key: argv.flags.key,
        password: argv.flags.password,
        output: argv.flags.output,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
)

const uploadCommand = command(
  {
    name: 'upload',
    help: {
      description: 'Encrypt a local file and upload to FOC warm storage',
    },
    parameters: ['<file>'],
    flags: {
      password: {
        type: String,
        alias: 'p',
        description: 'Encryption password',
      },
      key: {
        type: String,
        alias: 'k',
        description: 'Hex-encoded 256-bit key',
      },
      privateKey: {
        type: String,
        description: 'Wallet private key (or set PRIVATE_KEY env var)',
      },
    },
  },
  async (argv) => {
    try {
      await uploadFile({
        file: argv._.file,
        key: argv.flags.key,
        password: argv.flags.password,
        privateKey: argv.flags.privateKey,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
)

const downloadCommand = command(
  {
    name: 'download',
    help: {
      description: 'Download an encrypted blob from FOC and decrypt it',
    },
    parameters: ['<locator>'],
    flags: {
      password: {
        type: String,
        alias: 'p',
        description: 'Decryption password',
      },
      key: {
        type: String,
        alias: 'k',
        description: 'Hex-encoded 256-bit key',
      },
      output: {
        type: String,
        alias: 'o',
        description: 'Output file path',
      },
      privateKey: {
        type: String,
        description: 'Wallet private key (required for PieceCID locators)',
      },
    },
  },
  async (argv) => {
    try {
      await downloadFile({
        locator: argv._.locator,
        key: argv.flags.key,
        password: argv.flags.password,
        output:
          argv.flags.output ??
          (() => {
            throw new Error('--output is required')
          })(),
        privateKey: argv.flags.privateKey,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
)

const rangeCommand = command(
  {
    name: 'range',
    help: {
      description: 'Decrypt a byte range from a remote seekable encrypted blob',
    },
    parameters: ['<locator>'],
    flags: {
      password: {
        type: String,
        alias: 'p',
        description: 'Decryption password',
      },
      key: {
        type: String,
        alias: 'k',
        description: 'Hex-encoded 256-bit key',
      },
      offset: {
        type: Number,
        description: 'Start byte offset in plaintext',
      },
      length: {
        type: Number,
        description: 'Number of bytes to decrypt',
      },
      output: {
        type: String,
        alias: 'o',
        description: 'Output file path (default: stdout)',
      },
      privateKey: {
        type: String,
        description: 'Wallet private key (required for PieceCID locators)',
      },
    },
  },
  async (argv) => {
    try {
      await rangeDecrypt({
        locator: argv._.locator,
        key: argv.flags.key,
        password: argv.flags.password,
        offset:
          argv.flags.offset ??
          (() => {
            throw new Error('--offset is required')
          })(),
        length:
          argv.flags.length ??
          (() => {
            throw new Error('--length is required')
          })(),
        output: argv.flags.output,
        privateKey: argv.flags.privateKey,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exit(1)
    }
  }
)

cli(
  {
    name: 'foc-demo',
    version: '0.1.0',
    commands: [encryptCommand, decryptCommand, uploadCommand, downloadCommand, rangeCommand],
  },
  (argv) => {
    const unknownCommand = argv._.splice(0)[0]
    if (unknownCommand) {
      console.error(`Unknown command: ${unknownCommand}`)
      argv.showHelp()
      process.exit(1)
    }
    argv.showHelp()
  }
)
