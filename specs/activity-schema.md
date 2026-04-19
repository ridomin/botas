# Activity Schema Spec

**Purpose**: Define the JSON payload structure for activities exchanged between bots and the Bot Framework Service.
**Status**: Draft

---

## Overview

All communication between a bot and the Bot Framework Service uses **Activity** JSON objects. This document defines the schema and serialization rules.

> **Key insight**: Inbound and outbound activities have different requirements. See direction-specific tables below.

---

## Serialization Rules

| Rule | Description |
|------|-------------|
| **Property naming** | `camelCase` (e.g., `serviceUrl`, `channelId`) |
| **Null handling** | Omit properties with null/undefined values when writing |
| **Extension data** | Preserve all unknown properties. These MUST survive a round-trip. |

---

## Inbound Activity (Bot Framework → Bot)

Activities received from the Bot Framework.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Activity type (e.g., `"message"`, `"invoke"`) |
| `id` | Yes | Unique identifier (assigned by channel) |
| `serviceUrl` | Yes | Callback URL for replies |
| `channelId` | Yes | Source channel (e.g., `"msteams"`, `"webchat"`) |
| `conversation.id` | Yes | Conversation identifier |
| `from` | Yes | Sender (user) |
| `recipient` | Yes | Recipient (bot) |
| `text` | No | Message text |
| `name` | No | Invoke action name |
| `value` | No | Action payload |
| `entities` | No | Mentions, actions |
| `attachments` | No | Cards, files |

**Example:**

```json
{
  "type": "message",
  "id": "1234567890",
  "serviceUrl": "https://smba.trafficmanager.net/amer/",
  "channelId": "msteams",
  "from": { "id": "29:1abc-user-id", "name": "Alice" },
  "recipient": { "id": "28:bot-app-id", "name": "MyBot" },
  "conversation": { "id": "a]concat-123" },
  "text": "Hello bot!"
}
```

---

## Outbound Activity (Bot → Bot Framework)

Activities sent to the Bot Framework.

> **Note**: `serviceUrl` and `id` are NOT in the payload. The HTTP layer handles the URL; the channel assigns the ID on response.

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | Activity type (e.g., `"message"`) |
| `conversation.id` | Yes | Target conversation |
| `from` | Yes | Sender (bot) |
| `recipient` | Yes | Recipient (user) |
| `text` | No | Message text |
| `name` | No | Invoke action name |
| `value` | No | Action payload |
| `entities` | No | Mentions, actions |
| `attachments` | No | Cards, files |

**serviceUrl** is handled at the HTTP layer:

```
POST {serviceUrl}/v3/conversations/{conversationId}/activities
```

**Example:**

```json
{
  "type": "message",
  "text": "Hello user!",
  "from": { "id": "28:bot-app-id", "name": "MyBot" },
  "recipient": { "id": "29:1abc-user-id", "name": "Alice" },
  "conversation": { "id": "a]concat-123" }
}
```

**Response:**

```json
{ "id": "new-activity-id" }
```

---

## Common Types

### message

Text content.

```json
{ "type": "message", "text": "Hello!", ... }
```

### invoke

Server-side call (card actions, task modules). Bot MUST return a response body, not `{}`.

```json
{
  "type": "invoke",
  "name": "adaptiveCard/action",
  "value": { "action": { "type": "Action.Execute", "data": {} } }
}
```

### typing

Ephemeral presence signal. No text.

```json
{ "type": "typing", ... }
```

### conversationUpdate

Membership changes. Members are extension data.

```json
{
  "type": "conversationUpdate",
  "membersAdded": [...],
  "membersRemoved": [...]
}
```

### messageReaction

Reactions to a message.

```json
{
  "type": "messageReaction",
  "reactionsAdded": [...],
  "replyToId": "..."
}
```

### installationUpdate

Bot installed/uninstalled.

```json
{ "type": "installationUpdate", "action": "add" }
```

---

## ChannelAccount

User or bot identity.

```json
{ "id": "29:1abc...", "name": "User Name", "aadObjectId": "...", "role": "user" }
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier |
| `name` | `string` | Display name |
| `aadObjectId` | `string` | Azure AD object ID |
| `role` | `string` | `"user"` or `"bot"` |

> **Python note**: `from` is reserved. Python maps to `from_account` in code, serializes to `"from"`.

---

## Conversation

```json
{ "id": "conversation-id" }
```

All properties beyond `id` are preserved as extension data.

---

## References

- [Protocol Spec](./protocol.md) — HTTP contract
- [Bot Framework Activity Schema](https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference#activity-object)