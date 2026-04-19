# Targeted Messages

**Purpose**: Send messages visible to specific users in group chats.
**Status**: Draft

---

## Overview

**Targeted messages** = private notifications to specific users in group conversations, without triggering for other participants.

---

## API

### TurnContext

```csharp
// .NET
await ctx.SendTargetedAsync("Hello Alice!", aliceAccount, ct);
```

```typescript
// Node.js
await ctx.sendTargeted('Hello Alice!', aliceAccount);
```

```python
# Python
await ctx.send_targeted("Hello Alice!", alice_account)
```

### CoreActivityBuilder

```csharp
// .NET
var activity = new CoreActivityBuilder()
    .WithConversationReference(ctx.Activity)
    .WithText("Hello Alice!")
    .WithRecipient(aliceAccount, isTargeted: true)
    .Build();
```

```typescript
// Node.js
const activity = new CoreActivityBuilder()
    .withConversationReference(ctx.activity)
    .withText('Hello Alice!')
    .withRecipient(aliceAccount, true)
    .build();
```

```python
# Python
activity = CoreActivityBuilder() \
    .with_conversation_reference(ctx.activity) \
    .with_text("Hello Alice!") \
    .with_recipient(alice_account, is_targeted=True) \
    .build()
```

---

## Protocol

When `isTargeted` is `true`, append query parameter:

```
POST {serviceUrl}/v3/conversations/{conversationId}/activities?isTargetedActivity=true
```

### JSON Serialization

The `isTargeted` property is **NOT serialized** — it only controls query parameter:

```json
{
  "type": "message",
  "text": "Hello Alice!",
  "from": { "id": "28:bot-id" },
  "recipient": { "id": "29:user-id" }
}
```

---

## Rules

1. Query param `?isTargetedActivity=true` appended only when `isTargeted === true`
2. Property NOT included in JSON body
3. Works with `sendActivity`, `updateActivity`, `deleteActivity`

---

## References

- [teams.net PR #338](https://github.com/microsoft/teams.net/pull/338)