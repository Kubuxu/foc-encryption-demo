---
title: Access Controls in FOC
tags: Talk
description:
author: Kubuxu
date: 15-11-2025
---

# Access Controls
## in Filecoin On-chain Cloud



https://hackmd.io/@Kubuxu/fildev2025-AC
@Kubuxu

---

# Why?

Large market of private data

---


but ticking all checkboxes
for that market is not easy.

---

## Two non-exclusive paths

- client-side encryption
- gated data propagation

---


## Client-side encryption

- data is encrypted by the client
- only parties possessing the key can decrypt
- required because PDP leaks data
- significantly reduces required trust

---


## Client-side encryption

- key management is the crux of this approach
- requires alignment on encryption envelope

---

## Key management

- there are existing players in this space
- semi-mature distributed tech: Lit Protocol
- within ecosystem we have expertise on Lit through Keypo
- precise design depends on the use-case

---

## Encryption envelope

- same for all encryption schemes
- common across key management solutions
- baseline support for one or two encryption schemes
- for example a simple NaCl secure-box and a seekable scheme
- publish FRC on it
- 
---

## Encryption envelope
- Contains:
    - encryption scheme descriptor
    - key management descriptor and metadata (multiple)
- Aim: possession of the key allows a generic implementation to decrypt
- decouples key management implementation from the datapath


---

## Gated data propagation

"I want my data to only be accessible by X"


---

## Gated data propagation

- in combination with encryption creates stronger guarantees
- on its own, relies on trust and leaks information through PDP
- autonomous repair requires the set of people who can access the data to be wider than just the client
- [Data Segment Index v2" proposal #1216](https://github.com/filecoin-project/FIPs/discussions/1216) by Magik6k creates a small slot for access control metadata

---

## Gated data propagation

- could utilize same or similar policies as encryption
- supports wider set of policies due to not relying distribution of a key
- the spectrum of user requirements is even wider than encryption

---

## Tentative plans for Q12026

- market research
- define encryption envelope and FRC it
- support efforts of Keypo
- more if Access Control is a key feature

---

# Q&A

---

## Quick open questions

- Which users should we focus on first?
- How to do encryption and gated control of IPFS data?
- How to do high performance/low-latency distributed access control?
- How to achieve great UX with encryption based access control?


