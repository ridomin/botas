# Proactive Messaging

**Purpose**: Send messages outside a turn.
**Status**: Draft

---

## Overview

**Proactive messaging** = bot initiates message (notification, reminder).

### What you need:
1. **Conversation reference** — `serviceUrl` + `conversation.id` from previous turn
2. **`sendActivityAsync`** to send the activity
3. **Outbound auth** — handled automatically

---

## Store Reference

During a turn, save routing fields:

```csharp
// .NET
References[ctx.Activity.From.Id] = (ctx.Activity.ServiceUrl, ctx.Activity.Conversation.Id);
```

```typescript
// Node.js
references.set(ctx.activity.from.id, {
  serviceUrl: ctx.activity.serviceUrl,
  conversationId: ctx.activity.conversation.id,
})
```

```python
# Python
references[ctx.activity.from_account.id] = {
    "service_url": ctx.activity.service_url,
    "conversation_id": ctx.activity.conversation.id,
}
```

---

## Send Proactive Message

### Via `sendActivityAsync`

```csharp
// .NET
var activity = new CoreActivityBuilder()
    .WithServiceUrl(ref.ServiceUrl)
    .WithConversation(ref.ConversationId)
    .WithText("🔔 Notification!")
    .Build();
await bot.SendActivityAsync(activity, ct);
```

```typescript
// Node.js
await bot.sendActivityAsync(ref.serviceUrl, ref.conversationId, {
  type: 'message',
  text: '🔔 Notification!',
})
```

```python
# Python
await bot.send_activity_async(
    ref["service_url"],
    ref["conversation_id"],
    {"type": "message", "text": "🔔 Notification!"},
)
```

### Via `ConversationClient`

| Method | Description |
|--------|-------------|
| `sendCoreActivityAsync` | Send activity |
| `createConversationAsync` | Create new 1:1/group |
| `getConversationMembersAsync` | List members |
| `getConversationMemberAsync` | Get member by ID |
| `deleteConversationMemberAsync` | Remove member |

---

## Notes

- **serviceUrl is per-conversation** — use the one from the original activity
- **Token caching automatic** — handled by token manager
- **Wrap in try/catch** — conversation may no longer exist

---

## References

- [Protocol — Outbound](./protocol.md)
- [Outbound Auth](./outbound-auth.md)