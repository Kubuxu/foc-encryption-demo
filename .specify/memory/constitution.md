<!--
Sync Impact Report
===================
Version change: 1.0.0 → 1.1.0
Modified principles:
  - V. Performance Requirements → V. Performance Awareness (loosened for exploratory phase)
Modified sections:
  - Performance Standards (relaxed — removed CI gating, kept security-critical items)
  - Development Workflow (removed benchmark requirement from CI gate)
Templates requiring updates:
  - .specify/templates/plan-template.md — ✅ no update needed
  - .specify/templates/spec-template.md — ✅ no update needed
  - .specify/templates/tasks-template.md — ✅ no update needed
Follow-up TODOs: Revisit performance gating when project moves past exploratory phase
-->

# FOC Encryption Constitution

## Core Principles

### I. Code Quality

All code MUST be clear, readable, and maintainable. Functions MUST have
a single responsibility. Modules MUST have well-defined boundaries and
minimal coupling. Dead code, commented-out code, and unused imports MUST
be removed before merge. All public APIs MUST have documentation
describing purpose, parameters, return values, and error conditions.
Linting and formatting MUST be enforced automatically via CI — no code
merges without passing these checks.

### II. Test-Driven Development (NON-NEGOTIABLE)

Every feature and bug fix MUST follow the Red-Green-Refactor cycle:

1. Write a failing test that captures the requirement or reproduces the bug
2. Implement the minimum code to make the test pass
3. Refactor while keeping all tests green

Tests MUST be written and verified to fail BEFORE implementation begins.
Skipping TDD requires explicit justification documented in the PR
description and approval from a reviewer.

### III. Testing Standards

All test suites MUST be deterministic — no flaky tests allowed. Tests
MUST be independent and runnable in any order. Unit tests MUST cover all
public API surfaces. Integration tests MUST verify cross-module and
external-system interactions. Contract tests MUST validate any public
interface boundaries. Test names MUST describe the scenario and expected
outcome (e.g., `test_encrypt_returns_error_on_invalid_key`). Code
coverage MUST NOT decrease on any PR.

### IV. User Experience Consistency

All user-facing interfaces (CLI, API, error messages) MUST follow
consistent conventions across the project. Error messages MUST be
actionable — they MUST tell the user what went wrong and how to fix it.
Output formats MUST be stable across minor versions. Breaking changes to
user-facing behavior MUST be documented in release notes and follow
semantic versioning. CLI flags, argument names, and output structure MUST
follow established project conventions.

### V. Performance Awareness

Cryptographic operations MUST use constant-time implementations where
timing side-channels are a concern — this is a security requirement, not
an optimization. Beyond that, performance work SHOULD be deferred until
the design stabilizes. When performance matters for a feature, targets
SHOULD be noted in the specification but are not required to block merge.
Optimization SHOULD be driven by profiling data, not assumptions. Formal
benchmarks and CI-enforced regression gates will be introduced when the
project moves past the exploratory phase.

## Performance Standards

- Cryptographic operations MUST NOT introduce timing side-channels
- Memory-sensitive operations MUST zero buffers after use
- Benchmarks SHOULD be added for core encryption/decryption paths when
  the design stabilizes
- Gross performance issues SHOULD be noted but need not block progress
  during the exploratory phase

## Development Workflow

- All changes MUST go through pull requests with at least one review
- CI MUST pass before merge: linting, formatting, all test suites
- Commits MUST be atomic — one logical change per commit
- Branch names MUST follow the project's sequential numbering convention
- Every PR MUST reference the specification or issue it addresses
- Security-sensitive changes MUST receive additional review focused on
  cryptographic correctness

## Governance

This constitution is the authoritative source of development standards
for the FOC Encryption project. All PRs and code reviews MUST verify
compliance with these principles. Amendments to this constitution
require:

1. A written proposal documenting the change and rationale
2. Review and approval
3. A migration plan for any existing code affected by the change
4. Version bump following semantic versioning (MAJOR for principle
   removals/redefinitions, MINOR for additions/expansions, PATCH for
   clarifications)

Complexity beyond what these principles prescribe MUST be justified in
writing. When in doubt, prefer simplicity.

**Version**: 1.1.0 | **Ratified**: 2026-03-26 | **Last Amended**: 2026-03-26
