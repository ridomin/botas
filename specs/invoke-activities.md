# Invoke Activities

**Purpose**: Handle invoke activities (Adaptive Card actions, task modules).
**Status**: Implemented

---

## Overview

Invoke activities are request-response style:

| Inbound | Bot must return |
|---------|-----------------|
| `activity.type === "invoke"` | `InvokeResponse { status, body }` |

---

## Dispatch by `activity.name`

### API

```csharp
// .NET
app.OnInvoke("adaptiveCard/action", async (ctx, ct) =>
    => new InvokeResponse(200, new { result = "ok" }));

// Catch-all
app.OnInvoke(async (ctx, ct) => new InvokeResponse(501));
```

```typescript
// Node.js
app.onInvoke('adaptiveCard/action', async (ctx) =>
    ({ status: 200, body: { result: 'ok' } }));

// Catch-all
app.onInvoke(async (ctx) => ({ status: 501 }));
```

```python
# Python
@app.on_invoke("adaptiveCard/action")
async def on_card_action(ctx) -> InvokeResponse:
    return InvokeResponse(status=200, body={"result": "ok"})

# Catch-all
@app.on_invoke()
async def on_invoke_fallback(ctx) -> InvokeResponse:
    return InvokeResponse(status=501)
```

### InvokeResponse

| Language | Type |
|----------|------|
| .NET | `InvokeResponse(int status, object? body)` |
| Node.js | `{ status: number, body?: any }` |
| Python | `InvokeResponse(status: int, body: Any | None)` |

---

## Dispatch Rules

| Condition | Result |
|-----------|--------|
| Specific handler matches | **200** with body |
| No match, catch-all exists | **Catch-all runs** |
| No match, no catch-all | **501** |
| No handlers registered | **200 `{}`** |

### Conflict Rule

**Cannot register both specific AND catch-all invoke handlers.** Returns error at registration.

---

## HTTP Response

The framework translates InvokeResponse to HTTP:

```
InvokeResponse { status: 200, body: { result: "ok" } }
→ HTTP 200, {"result": "ok"}

InvokeResponse { status: 501 }
→ HTTP 501, (no body)
```

---

## Common Invoke Names

| Name | Description |
|------|-------------|
| `adaptiveCard/action` | Card button submit |
| `task/fetch` | Task module fetch |
| `task/submit` | Task module submit |
| `signin/verifyState` | OAuth verification |

---

## Example

Inbound:
```json
{ "type": "invoke", "name": "adaptiveCard/action", "value": { "action": { "data": { "choice": "approve" } } }
```

Handler:
```typescript
app.onInvoke('adaptiveCard/action', async (ctx) => {
    const choice = ctx.activity.value.action.data.choice;
    if (choice === 'approve') {
        return { status: 200, body: { message: 'Approved!' } };
    }
    return { status: 400, body: { error: 'Invalid' } };
});
```

---

## References

- [Protocol](./protocol.md)
- [Bot Framework Invoke](https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-activities#invoke-activity)