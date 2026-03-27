import { parseFragment, buildFragment } from './fragment.js'
import { fetchAndDecrypt } from './decrypt.js'
import { detectContentType } from './render.js'
import { showForm, showLoading, showError, showConfirmation, renderContent } from './ui.js'

const container = document.getElementById('app')!

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
    // US4: Password-prompt mode (#url=... only) — implemented in Phase 6
    // For now fall through to form with URL pre-filled
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
    }, { url: fragment.url })
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
