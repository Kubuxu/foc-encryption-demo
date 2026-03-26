# Research: Cache Envelope Parsing for decryptRange

## R1: What additional fields does `decryptRange` need beyond `EnvelopeMetadata`?

**Decision**: Add `protectedHeaders: Uint8Array` to `EnvelopeMetadata`.

**Rationale**: `decryptRange` calls `chunkedScheme.decryptRange(key, ciphertext, envelope.iv, envelope.protectedHeaders, ...)`. The `protectedHeaders` field exists on `DecodedEnvelope` (internal) but is not exposed in the public `EnvelopeMetadata` type. All other needed fields (`envelopeSize`, `chunkSize`, `chunkCount`, `iv`, `algorithm`) are already present.

**Alternatives considered**:
- Create a separate `DecryptRangeMetadata` type: Rejected — adds unnecessary type proliferation. `protectedHeaders` is general envelope metadata, not specific to range decryption.
- Pass `DecodedEnvelope` directly: Rejected — it's an internal type from `cose/decode.ts` and should not be part of the public API.

## R2: How should `parseEnvelope` support `BlobFetcher`?

**Decision**: Make `parseEnvelope` accept `Uint8Array | BlobFetcher` and return `Promise<EnvelopeMetadata>` (always async). When given a `BlobFetcher`, it calls `fetchEnvelope()` to get the envelope bytes, then decodes as usual.

**Rationale**: The caller's workflow is: parse envelope from BlobFetcher once, then call `decryptRange` many times. `parseEnvelope` must accept `BlobFetcher` to support this without the caller manually calling `fetchEnvelope()` and passing raw bytes.

**Alternatives considered**:
- Keep `parseEnvelope` sync, require caller to call `fetchEnvelope()` themselves: Rejected — leaks internal details (the caller shouldn't need to know about `fetchEnvelope()` + `parseBlob()` pipeline). But this is a reasonable alternative if the user prefers.
- Add a separate `parseEnvelopeFromFetcher` function: Rejected — unnecessary split. A single function with union input is simpler.

## R3: Should `decryptRange` still validate the scheme is seekable?

**Decision**: Yes, `decryptRange` should still check `algorithm` from the passed metadata and throw `SchemeNotSeekableError` if non-seekable. This is a cheap check (comparing a number) and prevents cryptic errors downstream.

**Rationale**: Even though the caller has the metadata and could check themselves, defensive validation at the API boundary is cheap and prevents misuse.

## R4: Impact on `decrypt` function

**Decision**: No changes to `decrypt`. It operates on full blobs and does not use `BlobFetcher`. It already parses the envelope internally, which is correct for its single-call use case.

**Rationale**: The spec explicitly scopes this change to `decryptRange` only. `decrypt` with a full `Uint8Array` remains the right API for in-memory blobs.
