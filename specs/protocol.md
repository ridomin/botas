# Protocol Spec

**Purpose**: Define the HTTP protocol contract for bots built with `botas`.
**Status**: Draft

---

## Overview

A `botas` bot communicates with the Microsoft Bot Framework Service over two HTTP channels:

| Direction | Endpoint | Who calls whom |
|-----------|----------|----------------|
| **Inbound** | `POST /api/messages` | Bot Framework → Bot |
| **Outbound** | `POST {serviceUrl}v3/conversations/{conversationId}/activities` | Bot → Bot Framework |

Both channels carry JSON [Activity](./activity-schema.md) payloads authenticated with bearer tokens (see [Inbound Auth](./inbound-auth.md) and [Outbound Auth](./outbound-auth.md)).

---

## Inbound: Receiving Activities

### Endpoint

```
POST /api/messages
```

The path `/api/messages` is the conventional default. Implementations MAY allow it to be configured.

### Request

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {jwt-token}` |

The body is a single [Activity](./activity-schema.md) JSON object.

### Authentication

Every inbound request MUST be authenticated by validating the JWT bearer token **before** any activity processing. See [Inbound Auth](./inbound-auth.md) for full details.

### Processing Pipeline

Once authenticated, the activity flows through the turn pipeline:

```
HTTP POST /api/messages
  └─ JWT validation (reject with 401 if invalid)
       └─ Middleware chain (registration order)
            └─ Handler dispatch (by activity type)
```

#### Middleware

Implementations MUST support a middleware pipeline with these properties:

1. Middleware executes **in registration order**.
2. Each middleware receives the bot application context, the activity, and a `next` delegate.
3. Middleware MAY inspect or modify the activity.
4. Middleware MAY short-circuit by **not** calling `next()`.
5. Middleware MAY perform work after calling `next()` (post-processing).

#### Handler Dispatch

After middleware, the activity is dispatched to a registered handler based on `activity.type`:

- If a handler IS registered for the type → invoke it.
- If NO handler is registered for the type → **silently ignore** the activity (no error).

**Case sensitivity**: Handler lookup by `activity.type` SHOULD use **case-insensitive** comparison.

##### CatchAll Handler

A CatchAll handler is an optional, application-level callback that, when set, **replaces per-type handler dispatch entirely**:

- When a CatchAll handler IS set, all incoming activities bypass per-type dispatch and are delivered directly to the CatchAll handler.
- When a CatchAll handler IS NOT set, the per-type dispatch behavior applies unchanged.
- Per-type handlers registered via `On()` / `on()` / `on_activity()` are **NOT invoked** if a CatchAll handler is set.
- Exceptions thrown inside a CatchAll handler MUST be wrapped in `BotHandlerException`.

#### Error Wrapping

Any exception thrown inside a handler MUST be wrapped in a language-specific `BotHandlerException` equivalent. The wrapper MUST carry:
- The original exception/error as the inner cause.
- A reference to the activity that triggered the error.

**Cancellation exceptions**: `OperationCanceledException` (.NET), `AbortError` (Node.js), and `asyncio.CancelledError` (Python) SHOULD be re-thrown without wrapping.

### Response

| Condition | Status | Body |
|-----------|--------|------|
| Success | 200 | `{}` |
| Auth failure | 401 | Implementation-defined |
| Handler error | 500 | Implementation-defined |

On success the response body MUST be `{}` (empty JSON object).

### Input Validation

Before processing the activity, implementations MUST:

1. **Validate required fields** — `type` (non-empty string), `serviceUrl` (non-empty string), and `conversation.id` (non-empty string) MUST be present. Return `400` if missing.
2. **Validate service URL** — see [Service URL Validation](#service-url-validation) below.
3. **Protect against prototype pollution** — Strip keys like `__proto__`, `constructor`, and `prototype` from parsed activity payloads.

Implementations SHOULD enforce a maximum request body size (recommended: 1 MB) and return `413` on overflow.

### Service URL Validation

The `serviceUrl` from inbound activities MUST be validated against an allowlist before processing. This prevents SSRF attacks.

**Allowed hosts:**

| Host pattern | Description |
|--------------|-------------|
| `*.botframework.com` | Global Bot Framework service |
| `*.botframework.us` | US government cloud |
| `*.botframework.cn` | China cloud |
| `*.trafficmanager.net` | Azure Traffic Manager |
| `localhost` / `127.0.0.1` | Local development only |

**Rules:**
- HTTPS is required for all hosts except `localhost` / `127.0.0.1`.
- The same validation MUST apply to `serviceUrl` used in outbound requests.

---

## Middleware

Middleware intercepts every incoming activity before it reaches the handler.

### Middleware Pipeline

```
HTTP POST /api/messages
  └─ JWT validation (401 on failure)
       └─ Middleware[0](context, next)
            └─ Middleware[1](context, next)
                 └─ ...
                      └─ Middleware[N](context, next)
                           └─ Handler dispatch (by activity.type)
```

### Rules

1. **Registration order** — Middleware executes in the order it is registered.
2. **Pre- and post-processing** — Code before `next()` runs on the way in; code after `next()` runs on the way out.
3. **Short-circuiting** — If a middleware does **not** call `next()`, all subsequent middleware and the handler are skipped.
4. **Activity modification** — Middleware MAY inspect or modify the activity. Changes persist through the pipeline.
5. **Send from middleware** — Middleware MAY call `send()` before or after `next()`.
6. **Shared context** — The same `TurnContext` instance is passed to all middleware and the handler.
7. **Exception propagation** — Exceptions propagate back through the middleware chain.

### Interface (Language-Agnostic)

```typescript
// Middleware signature
type TurnMiddleware = (context: TurnContext, next: () => Promise<void>) => Promise<void>
```

For language-specific interfaces, see:
- [.NET](./reference/dotnet.md#middleware)
- [Node.js](./reference/node.md#middleware)
- [Python](./reference/python.md#middleware)

### Registration

| Language | Method |
|----------|--------|
| .NET | `app.Use(ITurnMiddleWare)` |
| Node.js | `bot.use(TurnMiddleware)` |
| Python | `bot.use(TurnMiddleware)` |

### Execution Order

Given middleware registered in order A → B → C:

```
→ A.pre → B.pre → C.pre → Handler → C.post ← B.post ← A.post
```

If B does not call `next()`:

```
→ A.pre → B (no next) ← A.post
```

C and the handler are never reached.

### Patterns

For middleware implementation patterns (logging, error handling, filtering, etc.), see [reference/dotnet.md](./reference/dotnet.md#middleware-patterns), [reference/node.md](./reference/node.md#middleware-patterns), [reference/python.md](./reference/python.md#middleware-patterns).

### Interaction with CatchAll Handler

When a CatchAll handler is set, middleware still executes normally. The CatchAll replaces per-type dispatch at the end of the pipeline:

```
Middleware[0] → Middleware[1] → ... → CatchAll handler
```

---

## Outbound: Sending Activities

### Endpoint

```
POST {serviceUrl}/v3/conversations/{conversationId}/activities
```

- `{serviceUrl}` — from the original inbound activity. Normalize trailing slashes — exactly one `/` between `serviceUrl` and `v3`.
- `{conversationId}` — `activity.conversation.id`.

> **Note**: Some channels include semicolons in conversation IDs. Truncate at first `;` before URL-encoding. The full ID is still used in the activity body.

### Request

| Header | Value |
|--------|-------|
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {oauth-token}` |

The bearer token MUST be obtained via OAuth 2.0 client credentials flow. See [Outbound Auth](./outbound-auth.md).

### Response

On success the Bot Framework returns:

```json
{ "id": "new-activity-id" }
```

### ConversationClient API Surface

| Method | HTTP | Path | Description |
|--------|------|------|-------------|
| Send activity | `POST` | `v3/conversations/{id}/activities` | Send an activity |
| Update activity | `PUT` | `v3/conversations/{id}/activities/{activityId}` | Update an activity |
| Delete activity | `DELETE` | `v3/conversations/{id}/activities/{activityId}` | Delete an activity |
| Create conversation | `POST` | `v3/conversations` | Create new conversation |
| Get members | `GET` | `v3/conversations/{id}/members` | List members |
| Get member | `GET` | `v3/conversations/{id}/members/{memberId}` | Get single member |
| Delete member | `DELETE` | `v3/conversations/{id}/members/{memberId}` | Remove member |
| Get conversations | `GET` | `v3/conversations` | List conversations |

All methods require outbound authentication and service URL validation.

---

## Activity Types

| Type | Description |
|------|-------------|
| `message` | Text message from user or bot |

The type string is open-ended — implementations MUST support registering handlers for arbitrary type values.

---

## Resource Cleanup

| Language | Cleanup mechanism |
|----------|-------------------|
| .NET | `IAsyncDisposable` / DI container |
| Node.js | Automatic via `fetch` |
| Python | `async with` context manager or `aclose()` |

See [reference/](./reference/) for language-specific details.

---

## Configuration

| Variable | Description |
|----------|-------------|
| `CLIENT_ID` | Azure AD application (bot) ID |
| `CLIENT_SECRET` | Azure AD client secret |
| `TENANT_ID` | Azure AD tenant ID (or `"common"`) |
| `PORT` | HTTP listen port (default: `3978`) |

---

## References

- [Activity Schema](./activity-schema.md)
- [Inbound Auth](./inbound-auth.md)
- [Outbound Auth](./outbound-auth.md)
- [Bot Framework REST API](https://learn.microsoft.com/azure/bot-service/rest-api/bot-framework-rest-connector-api-reference)