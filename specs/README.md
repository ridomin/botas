# Botas Spec

**Purpose**: Enable LLM-driven implementation across programming languages.
**Status**: Draft

---

## Overview

`botas` is a lightweight library for building Microsoft Bot Framework bots. This spec documents behavioral contracts for cross-language parity.

---

## Core Specs

| Spec | Purpose |
|------|---------|
| [protocol.md](./protocol.md) | HTTP contract, middleware pipeline, handler dispatch |
| [inbound-auth.md](./inbound-auth.md) | JWT validation for incoming requests |
| [outbound-auth.md](./outbound-auth.md) | OAuth 2.0 client credentials for outbound |
| [activity-schema.md](./activity-schema.md) | Activity JSON structure |
| [Configuration.md](./Configuration.md) | Environment variables |

## Feature Specs

| Spec | Purpose |
|------|---------|
| [ProactiveMessaging.md](./ProactiveMessaging.md) | Out-of-turn messaging |
| [invoke-activities.md](./invoke-activities.md) | Invoke activity dispatch |
| [teams-activity.md](./teams-activity.md) | Teams-specific features |
| [reactions.md](./reactions.md) | Add emoji reactions to messages |
| [targeted-messages.md](./targeted-messages.md) | Send to specific users in groups |

---

## User Stories (Gherkin)

### US-001: Echo Bot

```
Feature: Bot responds to user messages
  Scenario: Simple message response
    Given a running bot
    When user sends "hello"
    Then bot responds with "you said hello"

  Scenario: Empty message handling
    Given a running bot
    When user sends empty message
    Then bot handles gracefully (no crash)

  Scenario: Authentication
    Given a running bot
    When Bot Framework sends activity
    Then JWT token is validated
```

### US-002: Proactive Messaging

```
Feature: Bot sends messages outside turn
  Scenario: Send to stored conversation
    Given a stored conversation reference
    When bot sends proactive message
    Then user receives the message

  Scenario: Invalid reference
    Given an invalid conversation reference
    When bot sends message
    Then error is returned
```

### US-003: Middleware Pipeline

```
Feature: Custom middleware processes activities
  Scenario: Middleware executes before handler
    Given middleware is registered
    When activity is received
    Then middleware runs before handler

  Scenario: Multiple middleware order
    Given multiple middleware registered
    When activity is received
    Then execute in registration order

  Scenario: Middleware short-circuit
    Given middleware calls next()
    Then subsequent middleware and handler execute
```

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-001 | Implementation passes all user story acceptance scenarios |
| AC-002 | Protocol-compliant serialization/deserialization |
| AC-003 | JWT validation and OAuth client credentials work |
| AC-004 | Code follows target language idioms |

---

## Reference Implementations

| Language | API Reference |
|----------|---------------|
| .NET | [reference/dotnet.md](./reference/dotnet.md) |
| Node.js | [reference/node.md](./reference/node.md) |
| Python | [reference/python.md](./reference/python.md) |

---

## Samples

- Echo Bot: `dotnet/samples/EchoBot/`, `node/samples/`, `python/samples/`
- Teams: `dotnet/samples/TeamsSample/`, `node/samples/teams-sample/`, `python/samples/teams-sample/`

---

## Future Specs

Not yet implemented features live in [future/](./future/).