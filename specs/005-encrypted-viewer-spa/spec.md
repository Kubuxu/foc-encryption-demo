# Feature Specification: Encrypted Content Viewer SPA

**Feature Branch**: `005-encrypted-viewer-spa`
**Created**: 2026-03-27
**Status**: Draft
**Input**: User description: "Plan out a implementation of a static single page website to use foc-encryption to fetch files and display them. When opened without URL fragment the website should ask for retrieval URL and password and when provided download the content replace its own content with the downloaded and decrypted content. It should also update the URL fragment to embed the retrieval URL and password. The user also should be, instead of opening the content, provide the URL and optionally the password and copy the resulting URL with fragments, such that user can share the content. If fragment with a URL but no password is opened, the page should prompt the user for password."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Direct Content Viewing via Shared Link (Priority: P1)

A user receives a full link (with URL fragment containing both retrieval URL and password) from someone who has shared encrypted content. They open the link in their browser. The page automatically fetches the encrypted content from the retrieval URL, decrypts it using the embedded password, and replaces the page content with the decrypted result.

**Why this priority**: This is the core value proposition -- zero-friction access to shared encrypted content via a single link click.

**Independent Test**: Can be tested by generating a link with a known retrieval URL and password fragment, opening it, and verifying the decrypted content is displayed.

**Acceptance Scenarios**:

1. **Given** a URL with fragment containing retrieval URL and password, **When** the user opens the link, **Then** the page fetches, decrypts, and displays the content automatically without any user interaction.
2. **Given** a URL with fragment containing retrieval URL and password, **When** the content is successfully decrypted, **Then** the original page UI (form, instructions) is fully replaced by the decrypted content.
3. **Given** a URL with fragment containing retrieval URL and password, **When** the retrieval URL is unreachable or returns an error, **Then** the page displays a clear error message indicating the content could not be fetched.
4. **Given** a URL with fragment containing retrieval URL and password, **When** the password is incorrect, **Then** the page displays a clear error message indicating decryption failed (wrong password).

---

### User Story 2 - Manual Content Viewing (Priority: P1)

A user opens the page without any URL fragment. They are presented with a form to enter a retrieval URL and password. After submitting, the page fetches and decrypts the content, displays it, and updates the URL fragment to contain the retrieval URL and password so the user can bookmark or share the link.

**Why this priority**: This is the primary entry point for users who have a retrieval URL and password but not a pre-built link.

**Independent Test**: Can be tested by opening the page with no fragment, entering a valid retrieval URL and password, and verifying content is displayed and the URL fragment is updated.

**Acceptance Scenarios**:

1. **Given** the page is opened without a URL fragment, **When** the page loads, **Then** the user sees a form with fields for retrieval URL and password, and two action buttons: "View Content" and "Copy Link".
2. **Given** the form is displayed, **When** the user enters a valid retrieval URL and password and submits, **Then** the content is fetched, decrypted, and displayed, replacing the form.
3. **Given** the form is displayed, **When** the user submits and content is successfully displayed, **Then** the browser URL fragment is updated to contain the retrieval URL and password.
4. **Given** the form is displayed, **When** the user enters an invalid URL or wrong password, **Then** an appropriate error message is shown and the form remains usable.

---

### User Story 3 - Link Generation for Sharing (Priority: P2)

A user wants to create a shareable link without viewing the content themselves. They provide a retrieval URL and optionally a password, and the page generates a complete URL with the appropriate fragment. The user can copy this link to share with others.

**Why this priority**: Enables content sharing workflow without requiring the user to download and view the content first.

**Independent Test**: Can be tested by entering a retrieval URL and password in the link generation mode and verifying a correctly formatted link is produced and copyable.

**Acceptance Scenarios**:

1. **Given** the page is in its initial state with the form displayed, **When** the user enters a retrieval URL and optionally a password and clicks "Copy Link", **Then** a shareable URL is generated.
2. **Given** the link generation form, **When** the user provides a retrieval URL and password, **Then** a full shareable URL with the fragment is generated and displayed.
3. **Given** the link generation form, **When** the user provides only a retrieval URL (no password), **Then** a URL with only the retrieval URL in the fragment is generated (recipients will be prompted for password).
4. **Given** a generated link is displayed, **When** the user clicks a copy button, **Then** the link is copied to the clipboard and the user receives visual confirmation.

---

### User Story 4 - Password Prompt for Partial Links (Priority: P2)

A user opens a link that has a retrieval URL in the fragment but no password. The page prompts them to enter the password. After entering it, the content is fetched, decrypted, and displayed, and the URL fragment is updated to include the password.

**Why this priority**: Supports the common security pattern where the retrieval URL and password are shared through separate channels.

**Independent Test**: Can be tested by opening a URL with only a retrieval URL in the fragment and verifying the password prompt appears, and after entering the correct password, content is displayed.

**Acceptance Scenarios**:

1. **Given** a URL with a fragment containing only a retrieval URL (no password), **When** the page loads, **Then** the user sees a password input field with the retrieval URL shown (read-only) and a submit button.
2. **Given** the password prompt is shown, **When** the user enters the correct password and submits, **Then** the content is fetched, decrypted, and displayed.
3. **Given** the password prompt is shown, **When** the user enters the correct password and content is displayed, **Then** the URL fragment is updated to include both the retrieval URL and password.
4. **Given** the password prompt is shown, **When** the user enters an incorrect password, **Then** a clear error message is shown and the user can try again.

---

### Edge Cases

- What happens when the encrypted content is very large (e.g., >100 MB)? The page should show a progress indicator during fetch and decrypt.
- What happens when the decrypted content is not HTML? The system should detect the content type and display it inline when possible (images, plain text, PDF), or offer a file download for unsupported types (binary data, archives, etc.).
- What happens when the retrieval URL requires authentication or CORS blocks the request? The page should display a clear error explaining the content could not be accessed.
- What happens when the user navigates back after content is displayed? The browser back button should return to the form/initial state.
- What happens when the URL fragment is malformed? The page should fall back to the manual entry form with an error message.

## Clarifications

### Session 2026-03-27

- Q: What format should the URL fragment use to encode the retrieval URL and password? → A: Query-style key-value format: `#url=<encoded-url>&pw=<encoded-password>`. Values are URI-encoded. When password is omitted, fragment is just `#url=<encoded-url>`.
- Q: How should decrypted HTML content be rendered -- sandboxed, sanitized, or trusted? → A: Trusted content, rendered directly into the page DOM without sanitization. The page is hosted on a dedicated domain with no other functionality.
- Q: How should the system detect decrypted content type? → A: Magic bytes / content sniffing -- inspect the first bytes of decrypted data to determine the content type.
- Q: How does the user switch between "view content" and "link generation" modes? → A: Single form with two action buttons side by side: "View Content" and "Copy Link". Both use the same URL and password fields.
- Q: How should non-HTML content (images, text, PDF) be displayed? → A: Minimal wrapper with centered content and a small toolbar (download button, filename if detectable). If wrapper complexity arises, fall back to full page replacement or download.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST be a static single-page website that can be hosted on any static file server without server-side processing.
- **FR-002**: System MUST parse the URL fragment on page load to determine the operating mode (auto-decrypt, password prompt, or manual entry).
- **FR-003**: System MUST provide a single form for manual entry of retrieval URL and password when no URL fragment is present, with two action buttons: "View Content" (fetches, decrypts, and displays) and "Copy Link" (generates and copies a shareable URL).
- **FR-004**: System MUST fetch encrypted content from the provided retrieval URL using standard web requests.
- **FR-005**: System MUST decrypt fetched content using the foc-encryption library with a content encryption key derived from the user-provided password.
- **FR-006**: System MUST replace the page content with the decrypted content after successful decryption. HTML content is rendered directly into the DOM as trusted content (no sanitization).
- **FR-007**: System MUST update the URL fragment using query-style format `#url=<encoded-url>&pw=<encoded-password>` (values URI-encoded) after successful content viewing. When password is omitted, fragment uses `#url=<encoded-url>` only.
- **FR-008**: System MUST provide a link generation mode where users can create shareable URLs with embedded retrieval URL and optional password.
- **FR-009**: System MUST provide clipboard copy functionality for generated shareable links.
- **FR-010**: System MUST prompt for password only when the URL fragment contains a retrieval URL but no password.
- **FR-011**: System MUST display clear, user-friendly error messages for fetch failures, decryption failures, and invalid inputs.
- **FR-012**: System MUST show a loading/progress indicator while fetching and decrypting content.
- **FR-014**: System MUST detect the content type of decrypted data by inspecting magic bytes / content sniffing, and display it inline when possible (HTML, images, plain text, PDF), or offer a file download for unsupported content types. Non-HTML inline content is shown in a minimal wrapper (centered content, download button). If wrapper complexity arises during implementation, fall back to full page replacement or direct download.
- **FR-013**: The URL fragment MUST NOT be sent to any server (fragments are client-side only by design, ensuring the password never leaves the browser).

### Key Entities

- **Retrieval URL**: The HTTP(S) endpoint serving the encrypted blob, supporting Range requests for efficient partial fetching.
- **Password**: A user-provided passphrase used to derive the content encryption key via PBKDF2.
- **URL Fragment**: The portion of the page URL after `#`, encoding the retrieval URL and optionally the password. Never sent to servers by browser design.
- **Encrypted Blob**: A foc-encryption formatted blob consisting of a COSE envelope followed by AES-256-GCM ciphertext.
- **Decrypted Content**: The plaintext result after decryption, displayed as the page content.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can view shared encrypted content in under 5 seconds (for content under 1 MB on a broadband connection) from link click to content display.
- **SC-002**: Users can manually enter a retrieval URL and password and view content in under 3 interactions (fill URL, fill password, submit).
- **SC-003**: Users can generate and copy a shareable link in under 3 interactions.
- **SC-004**: 100% of decryption errors (wrong password, corrupted data) result in a clear, actionable error message rather than a blank page or raw error.
- **SC-005**: The page works correctly when served from any static hosting provider without server-side configuration.
- **SC-006**: The password and retrieval URL are never transmitted to any server (remain exclusively in the URL fragment and client-side memory).

## Assumptions

- Users have a modern browser with Web Crypto API support (all major browsers since 2015).
- The retrieval URL serves content accessible via CORS or is on the same origin as the page.
- The encrypted content was created using the foc-encryption library with password-based key derivation (PBKDF2 parameters stored in the envelope's appMetadata).
- The system detects content type after decryption and displays inline when possible (HTML, images, plain text, PDF), or offers a file download for unsupported types.
- The page is hosted on a dedicated domain with no other functionality, so decrypted HTML content can be rendered as trusted.
- The page is a single self-contained HTML file (or minimal set of static assets) with no build-time server dependencies.
- The foc-encryption library can be bundled for browser use.
