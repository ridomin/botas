# Samples

**Purpose**: List of Botas samples with what they demonstrate.
**Status**: Draft

---

## Sample Matrix

| Sample | .NET | Node.js | Python | What it demonstrates |
|--------|------|---------|--------|---------------------|
| Echo Bot | `dotnet/samples/EchoBot` | `node/samples/echo-bot` | `python/samples/echo-bot` | Simple `BotApp` API |
| Teams | `dotnet/samples/TeamsSample` | `node/samples/teams-sample` | `python/samples/teams-sample` | Mentions, cards, actions |
| Express | — | `node/samples/express` | — | Manual Express |
| Hono | — | `node/samples/hono` | — | Manual Hono |
| FastAPI | — | — | `python/samples/fastapi` | Manual FastAPI |
| aiohttp | — | — | `python/samples/aiohttp` | Manual aiohttp |
| ASP.NET | `dotnet/samples/AspNetHosting` | — | — | Manual ASP.NET Core |

---

## Echo Bot

The simplest bot — receives a message, echoes it back.

| User sends | Bot replies |
|-----------|------------|
| `hello` | `You said: hello` |
| *(empty)* | Handles gracefully |

See: `dotnet/samples/EchoBot/`, `node/samples/echo-bot/`, `python/samples/echo-bot/`

---

## Teams Sample

- **"cards"** → Adaptive Card
- **"actions"** → Quick reply buttons
- **other** → @mention of sender

See: `dotnet/samples/TeamsSample/`, `node/samples/teams-sample/`, `python/samples/teams-sample/`

---

## Manual Framework Samples

For full control over routes, middleware, and DI:

| Sample | Framework | Auth helper |
|--------|----------|------------|
| `node/samples/express` | Express | `botAuthExpress()` |
| `node/samples/hono` | Hono | `botAuthHono()` |
| `python/samples/fastapi` | FastAPI | `bot_auth_dependency()` |
| `python/samples/aiohttp` | aiohttp | `validate_bot_token()` |
| `dotnet/samples/AspNetHosting` | ASP.NET Core | `AddBotApplication<T>()` |

---

## References

- [Setup](./Setup.md) — bot registration and credentials
- [reference/](./reference/) — full API reference