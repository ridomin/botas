# Reactions

**Purpose**: Add emoji reactions to messages.
**Status**: Draft

---

## Overview

Bots can add reactions (👍, ❤️, 🎉) to existing messages.

---

## API

### TurnContext

```csharp
// .NET
await ctx.AddReactionAsync("like", ct);
await ctx.AddReactionAsync("❤️", ct);
```

```typescript
// Node.js
await ctx.addReaction('like');
await ctx.addReaction('❤️');
```

```python
# Python
await ctx.add_reaction('like')
await ctx.add_reaction('❤️')
```

### ConversationClient

```csharp
await client.AddReactionAsync(conversationId, activityId, "like", serviceUrl, ct);
```

```typescript
await client.addReaction(conversationId, activityId, 'like', serviceUrl);
```

```python
await client.add_reaction(conversation_id, activity_id, 'like', service_url)
```

---

## Protocol

```
POST {serviceUrl}/v3/conversations/{conversationId}/activities/{activityId}/reactions
Content-Type: application/json

{ "type": "like" }
```

---

## Reaction Types

| Type | Emoji |
|------|-------|
| `like` | 👍 |
| `heart` | ❤️ |
| `laugh` | 😂 |
| `surprised` | 😮 |
| `sad` | 😢 |
| `angry` | 😠 |

Emoji strings are accepted and mapped to reaction types.

---

## References

- [Bot Framework Reactions API](https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-add-activity-reaction)