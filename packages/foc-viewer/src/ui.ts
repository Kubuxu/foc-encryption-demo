function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export interface FormCallbacks {
  onViewContent: (url: string, password: string) => void
  onCopyLink: (url: string, password: string) => void
}

/** Show the full manual-entry form (URL + password fields). */
export function showForm(
  container: HTMLElement,
  callbacks: FormCallbacks,
  initial?: { url?: string; password?: string }
): void {
  container.innerHTML = `
    <h1>FOC Encrypted Content Viewer</h1>
    <div class="form-group">
      <label for="url-input">Content URL</label>
      <input type="url" id="url-input" placeholder="https://..." value="${escapeHtml(initial?.url ?? '')}" />
    </div>
    <div class="form-group">
      <label for="pw-input">Password</label>
      <input type="password" id="pw-input" placeholder="Decryption password" value="${escapeHtml(initial?.password ?? '')}" />
    </div>
    <div class="button-row">
      <button class="btn-primary" id="view-btn">View Content</button>
      <button class="btn-secondary" id="copy-btn">Copy Link</button>
    </div>
    <div id="msg"></div>
  `
  const urlInput = container.querySelector<HTMLInputElement>('#url-input')!
  const pwInput = container.querySelector<HTMLInputElement>('#pw-input')!

  container.querySelector('#view-btn')?.addEventListener('click', () => {
    callbacks.onViewContent(urlInput.value.trim(), pwInput.value)
  })

  container.querySelector('#copy-btn')?.addEventListener('click', () => {
    callbacks.onCopyLink(urlInput.value.trim(), pwInput.value)
  })
}

/** Show a password prompt with a read-only URL field. */
export function showPasswordPrompt(container: HTMLElement, url: string, onSubmit: (password: string) => void): void {
  container.innerHTML = `
    <h1>FOC Encrypted Content Viewer</h1>
    <div class="form-group">
      <label for="url-input">Content URL</label>
      <input type="url" id="url-input" value="${escapeHtml(url)}" readonly />
    </div>
    <div class="form-group">
      <label for="pw-input">Password</label>
      <input type="password" id="pw-input" placeholder="Enter password to decrypt" />
    </div>
    <div class="button-row">
      <button class="btn-primary" id="view-btn">View Content</button>
    </div>
    <div id="msg"></div>
  `
  const pwInput = container.querySelector<HTMLInputElement>('#pw-input')!
  pwInput.focus()

  const submit = () => onSubmit(pwInput.value)
  container.querySelector('#view-btn')?.addEventListener('click', submit)
  pwInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit()
  })
}

/** Show a loading spinner. */
export function showLoading(container: HTMLElement): void {
  container.innerHTML = `
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>Decrypting content…</p>
    </div>
  `
}

/** Show an error message (retains the heading). */
export function showError(container: HTMLElement, message: string): void {
  container.innerHTML = `
    <div>
      <h1>FOC Encrypted Content Viewer</h1>
      <div class="error">${escapeHtml(message)}</div>
    </div>
  `
}

/** Show a confirmation message inside #msg element (if present). */
export function showConfirmation(container: HTMLElement, message: string): void {
  const msg = container.querySelector('#msg')
  if (msg) {
    msg.innerHTML = `<div class="confirmation">${escapeHtml(message)}</div>`
    setTimeout(() => {
      msg.innerHTML = ''
    }, 3000)
  }
}
