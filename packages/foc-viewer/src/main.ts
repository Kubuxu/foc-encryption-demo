import { fetchAndDecrypt } from './decrypt.js'
import { buildFragment, parseFragment } from './fragment.js'
import { detectContentType, renderContent } from './render.js'
import { showConfirmation, showError, showForm, showLoading, showPasswordPrompt } from './ui.js'

const container = document.getElementById('app') as HTMLElement

async function runAutoDecrypt(url: string, password: string): Promise<void> {
  showLoading(container)
  try {
    const data = await fetchAndDecrypt(url, password)
    const contentType = await detectContentType(data)
    renderContent(container, data, contentType)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    showError(container, message)
  }
}

function init(): void {
  const fragment = parseFragment(window.location.hash)

  if (fragment?.url && fragment.password !== undefined) {
    // US1: Auto-decrypt from shared link (#url=...&pw=...)
    runAutoDecrypt(fragment.url, fragment.password)
    return
  }

  if (fragment?.url) {
    // US4: Password-prompt mode (#url=... only)
    const blobUrl = fragment.url
    showPasswordPrompt(container, blobUrl, async (password) => {
      await runAutoDecrypt(blobUrl, password)
      if (password) {
        history.replaceState(null, '', buildFragment({ url: blobUrl, password }))
      }
    })
    return
  }

  // US2: Manual entry form — no fragment
  showForm(container, {
    onViewContent: async (url, password) => {
      await runAutoDecrypt(url, password)
      if (url && password) {
        history.replaceState(null, '', buildFragment({ url, password }))
      }
    },
    onCopyLink: (url, password) => {
      const link = window.location.origin + window.location.pathname + buildFragment({ url, password })
      navigator.clipboard.writeText(link).then(() => {
        showConfirmation(container, 'Link copied to clipboard!')
      })
    },
  })
}

init()
