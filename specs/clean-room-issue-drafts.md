# Clean-Room Issue Drafts

These issue drafts were produced from a clean-room read of `specs/` and `docs-site/` without opening implementation code.

They are intended to be copied into GitHub issues or used as a planning backlog for spec/doc cleanup before implementation work starts.

## Collapsed Backlog

This is the recommended collapsed version of the 12 drafts for GitHub filing.

### Issue A: Canonicalize the core inbound contract and dispatch model

This issue combines:

- `#1 Reconcile .NET handler dispatch model across specs`
- `#2 Consolidate invoke handling into the protocol contract`
- `#3 Clarify required inbound activity fields vs typed schema fields`
- `#4 Define malformed JSON, content-type, and body-size failure behavior`
- `#5 Normalize TurnContext typing and sendTyping return values`

**Problem**

The core inbound contract is currently spread across multiple specs and contains several contradictions or underspecified behaviors. A clean-room implementer cannot confidently answer:

- whether .NET dispatch is framework-owned or app-owned
- how invoke dispatch relates to the main protocol contract
- which fields are required at parse time versus validation time
- how malformed requests should fail
- what the canonical send API return types are

**Proposed resolution**

Make `specs/protocol.md` and `specs/README.md` the canonical source for inbound processing and public API behavior, with consistent language-specific notes and examples.

**Acceptance criteria**

- One canonical .NET dispatch model is documented across specs and docs
- Invoke behavior is summarized normatively in the protocol contract
- Required inbound fields are clearly distinguished from typed model fields
- Request-validation failure behavior is defined in a decision table
- `send`, `sendTyping`, and related return types are consistent across the spec set

### Issue B: Canonicalize the outbound contract, auth selection, and extension-data behavior

This issue combines:

- `#6 Specify extension-data preservation and serialization shape precisely`
- `#7 Make outbound URL construction a single normative algorithm`
- `#8 Tighten outbound auth flow selection and failure-mode rules`

**Problem**

The outbound contract is behaviorally strong but still leaves room for divergence in three sensitive areas:

- how unknown fields are stored internally versus serialized on the wire
- how service URLs and conversation IDs are turned into outbound request URLs
- how auth flow selection behaves under partial or invalid configuration

These are all parity-critical and easy to implement differently across .NET, Node, and Python.

**Proposed resolution**

Add normative algorithms and examples for outbound URL construction, extension-data round-tripping, and auth flow selection/failure modes.

**Acceptance criteria**

- Unknown-field round-trip behavior is defined at the JSON level
- Outbound URL construction is documented step-by-step with edge-case examples
- Auth flow selection has a complete truth table and defined failure behavior
- The resulting contract is implementable consistently across all three languages

### Issue C: Normalize package/docs references and add parity guidance for future work

This issue combines:

- `#9 Unify the Python package story across specs and docs`
- `#10 Repair and normalize Teams spec references`
- `#11 Add a cross-language parity checklist for new features`
- `#12 Add a clean-room implementation appendix or reference architecture`

**Problem**

The docs and specs are close to usable, but a few reference-level inconsistencies still make onboarding and clean-room implementation harder than necessary:

- Python package/import guidance is inconsistent
- Teams spec references point to different locations/statuses
- parity expectations are implied rather than checklist-driven
- architectural boundaries are still inferred rather than stated

**Proposed resolution**

Clean up package/reference inconsistencies and add lightweight guidance for parity and implementation boundaries.

**Acceptance criteria**

- Python package/import guidance is consistent across specs, samples, and docs
- Teams feature docs point to one canonical spec location
- `specs/Contributing.md` includes a parity checklist for future features
- `specs/Architecture.md` or a companion file contains a clean-room-safe reference architecture

## Prioritized Sequence

This is the recommended order to file and work the issues.

### Phase 1: unblock the core contract

These issues define the minimum canonical behavior needed before implementation work should begin.

1. `#1 Reconcile .NET handler dispatch model across specs`
2. `#2 Consolidate invoke handling into the protocol contract`
3. `#3 Clarify required inbound activity fields vs typed schema fields`
4. `#4 Define malformed JSON, content-type, and body-size failure behavior`
5. `#5 Normalize TurnContext typing and sendTyping return values`
6. `#7 Make outbound URL construction a single normative algorithm`
7. `#8 Tighten outbound auth flow selection and failure-mode rules`

### Phase 2: reduce cross-language drift

These issues make the contract easier to implement consistently across .NET, Node, and Python.

8. `#6 Specify extension-data preservation and serialization shape precisely`
9. `#9 Unify the Python package story across specs and docs`
10. `#10 Repair and normalize Teams spec references`
11. `#11 Add a cross-language parity checklist for new features`

### Phase 3: improve implementation readiness

This issue is valuable after the core contract is stabilized.

12. `#12 Add a clean-room implementation appendix or reference architecture`

## Dependency Map

The issues are not all independent. This is the recommended dependency chain.

### Foundation

- `#1` has no dependency and should go first.
- `#2` depends on `#1` because catch-all and dispatch ownership need to be coherent.
- `#3` has no hard dependency, but it should land before `#4` so request validation rules have a stable schema baseline.
- `#4` depends on `#3`.
- `#5` has no hard dependency, but it pairs naturally with `#1` because the public API surface is being normalized at the same time.
- `#7` has no hard dependency, but it should land before `#8` because auth and outbound transport rules interact.
- `#8` depends lightly on `#7`.

### Cross-language consistency

- `#6` depends lightly on `#3` because field-shape clarity helps define extension-data behavior.
- `#9` has no hard dependency, but it should land after `#1` through `#5` so Python examples are updated against the stabilized public API.
- `#10` has no hard dependency and can be done anytime, though it is a good companion to `#11`.
- `#11` should land after most Phase 1 clarifications so the checklist reflects the canonical contract.

### Implementation guidance

- `#12` depends on `#1`, `#2`, `#3`, `#6`, `#7`, and `#8` because the reference architecture should describe settled responsibilities, not open debates.

## Suggested Milestones

If we want to batch these into concrete deliverables, this is a good breakdown.

### Milestone A: canonical inbound contract

- `#1 Reconcile .NET handler dispatch model across specs`
- `#2 Consolidate invoke handling into the protocol contract`
- `#3 Clarify required inbound activity fields vs typed schema fields`
- `#4 Define malformed JSON, content-type, and body-size failure behavior`
- `#5 Normalize TurnContext typing and sendTyping return values`

### Milestone B: canonical outbound contract

- `#7 Make outbound URL construction a single normative algorithm`
- `#8 Tighten outbound auth flow selection and failure-mode rules`
- `#6 Specify extension-data preservation and serialization shape precisely`

### Milestone C: docs and parity cleanup

- `#9 Unify the Python package story across specs and docs`
- `#10 Repair and normalize Teams spec references`
- `#11 Add a cross-language parity checklist for new features`

### Milestone D: implementation handoff

- `#12 Add a clean-room implementation appendix or reference architecture`

## Recommended First Three

If we want the smallest high-leverage starting set, I’d begin with:

1. `#1 Reconcile .NET handler dispatch model across specs`
2. `#2 Consolidate invoke handling into the protocol contract`
3. `#3 Clarify required inbound activity fields vs typed schema fields`

Those three remove the biggest clean-room ambiguities and make the next spec edits much less likely to conflict with each other.

## 1. Reconcile .NET handler dispatch model across specs

**Problem**

The spec set describes two different .NET dispatch models:

- `specs/README.md` defines `.NET` `BotApplication.On(string activityType, ...)` and `OnActivity` as an optional catch-all.
- `specs/Architecture.md` says `.NET` uses a single `OnActivity` callback and that dispatch logic lives in application code.

This makes a clean-room implementation ambiguous because it changes whether dispatch is framework-owned or user-owned.

**Proposed resolution**

Choose one canonical .NET model and update all specs/docs to match it.

Recommended direction:

- Keep `.NET` aligned with Node/Python by making per-type registration framework-owned.
- Keep `OnActivity` as a true catch-all that overrides type and invoke dispatch.

**Acceptance criteria**

- One canonical .NET dispatch model is documented in `specs/README.md`, `specs/Architecture.md`, and language docs.
- Public API examples all use the same model.
- Catch-all behavior is explicitly defined for .NET and matches the protocol spec.

## 2. Consolidate invoke handling into the protocol contract

**Problem**

Normal activity dispatch is defined in `specs/protocol.md`, but invoke behavior is split into `specs/invoke-activities.md`. A clean-room implementation has to merge both documents to answer basic questions like:

- when to return `200 {}`
- when to return `501`
- whether catch-all overrides invoke dispatch
- what happens when an invoke handler forgets to return a response

**Proposed resolution**

Make `specs/protocol.md` the single normative entry point for inbound HTTP behavior, with invoke dispatch summarized there and `specs/invoke-activities.md` serving as the detailed companion doc.

**Acceptance criteria**

- `specs/protocol.md` contains the full invoke decision table or a concise normative summary.
- The default response rules for invoke activities are unambiguous.
- Catch-all and invoke interaction is described in one place and cross-referenced consistently.

## 3. Clarify required inbound activity fields vs typed schema fields

**Problem**

`specs/activity-schema.md` marks `from`, `recipient`, and `conversation` as required typed fields, while `specs/protocol.md` only requires `type`, `serviceUrl`, and `conversation.id` during inbound validation.

A clean-room implementer cannot tell whether missing `from` or `recipient` should:

- fail deserialization
- be accepted as partial data
- produce `400`
- remain nullable in the typed models

**Proposed resolution**

Separate wire-schema expectations from server-side validation requirements.

Recommended direction:

- Keep typed fields nullable/optional where channels may omit them.
- Add a table that distinguishes:
  - required for successful parsing
  - required for inbound request acceptance
  - required for outbound send helpers like `TurnContext.send()`

**Acceptance criteria**

- Required-field rules are consistent across `specs/activity-schema.md` and `specs/protocol.md`.
- Each field is labeled as parse-time, validation-time, or send-time required.
- The expected HTTP response for missing required inbound fields is documented.

## 4. Define malformed JSON, content-type, and body-size failure behavior

**Problem**

The specs mention `400` for missing fields and recommend `413` for large requests, but they do not fully define error behavior for:

- malformed JSON
- non-JSON `Content-Type`
- empty body
- body over 1 MB

This leaves room for behavioral drift between languages and web frameworks.

**Proposed resolution**

Add a request-validation matrix to `specs/protocol.md`.

**Acceptance criteria**

- A decision table covers malformed JSON, missing/incorrect `Content-Type`, empty body, missing required fields, and oversized body.
- Expected HTTP status codes are defined for each case.
- The table indicates which response bodies are implementation-defined versus fixed.

## 5. Normalize TurnContext typing and sendTyping return values

**Problem**

The current materials disagree on the .NET return type for `SendTypingAsync()`:

- one part of `specs/README.md` describes `Task`
- the language-difference table says `Task<string>`

There is also avoidable ambiguity around what `send()`, `sendTyping()`, and `SendActivityAsync()` return in each language.

**Proposed resolution**

Publish one canonical return-type table for all send APIs.

Recommended direction:

- `sendTyping` should not expose an activity ID unless there is a strong behavioral reason.
- return values should reflect whether the caller can actually use the response.

**Acceptance criteria**

- `TurnContext.send`, `sendTyping`, and top-level send methods have one canonical return type per language.
- All examples and comparison tables match.
- The spec explains when `None` / `undefined` is expected.

## 6. Specify extension-data preservation and serialization shape precisely

**Problem**

The schema says unknown fields must survive round-trip, but the docs describe different implementation storage strategies:

- .NET: `[JsonExtensionData]`
- Node: `properties`
- Python: `model_extra`

What is still unclear is the wire-level behavior:

- are unknown fields serialized back at the top level
- does Node keep them only in `properties`
- when a user constructs an activity programmatically, where should extra fields be placed

**Proposed resolution**

Add a normative extension-data section with deserialize/serialize examples for each language model.

**Acceptance criteria**

- Unknown-field round-trip behavior is defined at the JSON level, not just internal storage.
- Node and Python examples show how top-level unknown fields are preserved and re-emitted.
- Programmatic construction rules for extension data are documented.

## 7. Make outbound URL construction a single normative algorithm

**Problem**

Outbound sending currently depends on several scattered rules:

- validate `serviceUrl`
- normalize trailing slash handling
- truncate `conversationId` at `;` for the URL path
- keep the full `conversation.id` in the activity body

This is security- and parity-sensitive and easy to implement differently across languages.

**Proposed resolution**

Document one step-by-step URL construction algorithm in `specs/protocol.md`, with examples for common edge cases.

**Acceptance criteria**

- The algorithm is listed step-by-step.
- At least one example includes a trailing slash in `serviceUrl`.
- At least one example includes a semicolon-bearing Teams conversation ID.
- The expected final URL and body are both shown.

## 8. Tighten outbound auth flow selection and failure-mode rules

**Problem**

`specs/outbound-auth.md` gives a useful priority order, but a clean-room implementation still has open questions:

- what if `CLIENT_SECRET` is set but `TENANT_ID` is missing
- what exact error should be raised for an impossible config
- how should custom token factories interact with caching
- should no-auth mode skip outbound auth entirely or reject outbound sends

**Proposed resolution**

Add a configuration truth table and failure-mode section.

**Acceptance criteria**

- Every supported credential combination has an expected auth strategy.
- Invalid combinations have defined errors.
- The role of token caching and negative caching for custom token factories is documented.
- Dev/no-auth mode behavior for outbound calls is explicit.

## 9. Unify the Python package story across specs and docs

**Problem**

The Python import/package story is inconsistent:

- some canonical examples show `from botas import BotApp`
- other docs and samples show `from botas_fastapi import BotApp`
- language-difference tables describe built-in `aiohttp` in one place and FastAPI-focused packaging in another

This makes the public API and package boundary unclear.

**Proposed resolution**

Pick one canonical packaging model and update all examples.

Recommended direction:

- `botas` = core
- `botas-fastapi` = FastAPI convenience package exposing `BotApp`

**Acceptance criteria**

- All Python quick-start examples use the same import path.
- The specs distinguish clearly between core and framework-specific packages.
- Language-difference tables and samples match the chosen model.

## 10. Repair and normalize Teams spec references

**Problem**

The docs and specs point to different Teams spec locations, and the references are easy to miss or break:

- some places reference `specs/future/teams-activity.md`
- some docs reference `specs/teams-activity.md`

A clean-room reader cannot immediately tell which document is canonical or whether Teams activity support is current or aspirational.

**Proposed resolution**

Choose a single Teams spec location and status, then update all references.

**Acceptance criteria**

- Every Teams reference points to the same file.
- The file status clearly says whether the feature is current or future.
- `docs-site/teams-features.md` links to the canonical spec path.

## 11. Add a cross-language parity checklist for new features

**Problem**

The repo emphasizes parity, but the clean-room exercise still required manually cross-checking several docs to know what must stay aligned.

**Proposed resolution**

Add a short parity checklist to `specs/Contributing.md` and link it from feature specs.

Suggested checklist items:

- public registration API
- catch-all behavior
- invoke behavior
- auth flow support
- serialization and extension data
- resource cleanup
- docs and sample updates

**Acceptance criteria**

- `specs/Contributing.md` includes a parity checklist for spec and implementation work.
- New feature specs include a short cross-language parity table.
- Intentional differences are documented in exactly one canonical section.

## 12. Add a clean-room implementation appendix or reference architecture

**Problem**

The existing specs are strong on behavior, but a first-time implementer still has to infer architecture boundaries like:

- what `BotApplication` owns versus framework adapters
- where auth helpers should live
- what pieces are core versus convenience packages

**Proposed resolution**

Add a short implementation appendix that is still clean-room safe: module boundaries, responsibilities, and invariants without referencing current source layout.

**Acceptance criteria**

- A reference architecture section exists in `specs/Architecture.md` or a linked companion file.
- The appendix names the expected major components per language.
- It stays behavioral and architectural, not source-code-derived.
