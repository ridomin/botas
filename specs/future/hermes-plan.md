# Plan: Hermes Platform Adapter for Microsoft Teams (via Botas)

## Problem
[Hermes Agent](https://github.com/NousResearch/hermes-agent) (NousResearch) is a Python agent platform with adapters for Telegram, Discord, Slack, WhatsApp, etc. There is no Microsoft Teams adapter. We want to build one using the **botas** Python library, which already handles the Bot Framework protocol (HTTP endpoint, JWT auth, outbound OAuth, activity pipeline).

## Design Decision: Platform Adapter (not Plugin)
User chose a **full `BasePlatformAdapter` subclass** — Teams becomes a first-class Hermes messaging channel, alongside Discord/Slack/Telegram. This means Hermes can natively receive and send Teams messages.

## Architecture

### How Hermes adapters work
- All adapters inherit from `BasePlatformAdapter` (in `gateway/platforms/base.py`)
- Required abstract methods: `connect()`, `disconnect()`, `send(chat_id, content, reply_to, metadata)`
- Optional overrides: `send_typing()`, `send_image()`, `edit_message()`
- Adapters emit `MessageEvent` objects to the `_message_handler` callback
- Config via `PlatformConfig` + env vars

### How Botas works (Python)
- `BotApplication` receives activities via `process_body(body, auth_header)`
- Activities dispatched to handlers registered with `@bot.on("message")`
- `TurnContext.send()` sends replies via `ConversationClient` (outbound OAuth)
- `botas-fastapi` package provides an HTTP server integration
- Auth: inbound JWT validation + outbound OAuth2 client credentials

### Bridge Strategy
The adapter needs to bridge two models:
1. **Inbound (Teams → Hermes)**: Run an HTTP server (FastAPI/uvicorn) to receive Bot Framework `POST /api/messages`. Convert `CoreActivity` → `MessageEvent`. Pass to Hermes's `_message_handler`.
2. **Outbound (Hermes → Teams)**: Use Botas `ConversationClient` to send activities back to Teams via Bot Framework REST API.

```
Teams User ←→ Bot Framework Service ←→ [HTTP /api/messages] ←→ TeamsAdapter ←→ Hermes Agent
                                         (botas handles JWT/OAuth)
```

### Key mapping: Bot Framework ↔ Hermes

| Hermes concept | Bot Framework equivalent |
|---|---|
| `chat_id` | `activity.conversation.id` |
| `user_id` | `activity.from_.id` |
| `user_name` | `activity.from_.name` |
| `message_id` | `activity.id` |
| `content` (text) | `activity.text` |
| `reply_to` | `activity.reply_to_id` |
| `platform` | New `Platform.TEAMS` enum value |
| `session_key` | `build_session_key("teams", conversation_id)` |

## Location Options (TBD)
1. **Inside botas repo**: `python/packages/hermes-botas/` — pip-installable, close to the library
2. **Separate repo**: standalone package `hermes-teams` or `hermes-botas`
3. **Upstream PR to NousResearch/hermes-agent**: `gateway/platforms/teams.py`

## Todos

### 1. Scaffold the adapter package
- Create package structure (pyproject.toml, src/, tests/)
- Depend on `botas` and `botas-fastapi` (for HTTP server)
- Optional: depend on `hermes-agent` for base class types

### 2. Implement `TeamsAdapter(BasePlatformAdapter)`
- `__init__`: Create `BotApplication`, register message handler, set up `ConversationClient`
- `connect()`: Start uvicorn HTTP server on configured port, accepting `POST /api/messages`
- `disconnect()`: Shut down the HTTP server
- `send(chat_id, content)`: Use stored `ConversationClient` + `service_url` to send reply activity
- `send_typing(chat_id)`: Send typing indicator activity
- `edit_message(chat_id, message_id, content)`: Update activity via Bot Framework API
- `send_image(chat_id, image_url)`: Send image attachment

### 3. Bridge inbound activities to MessageEvent
- In the BotApplication message handler, convert `CoreActivity` fields to `MessageEvent`
- Handle `activity.type == "message"` (text, attachments)
- Handle `activity.type == "conversationUpdate"` (member joined/left)
- Handle `activity.type == "invoke"` (cards, adaptive card actions)
- Preserve Teams-specific data (`channelData`, mentions, tenant info)

### 4. Handle outbound message formatting
- Convert Hermes markdown to Teams-compatible markdown
- Handle image extraction (Hermes `extract_images()` pattern)
- Support Adaptive Cards if content contains structured data
- Respect Teams message size limits (~28KB)

### 5. Configuration & env vars
- `TEAMS_CLIENT_ID` / `CLIENT_ID` — Azure AD app ID
- `TEAMS_CLIENT_SECRET` / `CLIENT_SECRET` — Azure AD secret
- `TEAMS_TENANT_ID` / `TENANT_ID` — Azure AD tenant
- `TEAMS_PORT` — HTTP server port (default 3978)
- Add `Platform.TEAMS` to Hermes config enum

### 6. Conversation state management
- Cache `service_url` per conversation (needed for outbound replies)
- Map Hermes session keys to Bot Framework conversation IDs
- Handle proactive messaging (Hermes → Teams without prior inbound)

### 7. Tests
- Unit tests for activity ↔ MessageEvent conversion
- Unit tests for outbound message formatting
- Integration test with mock Bot Framework endpoint
- Test auth flow (JWT validation, token caching)

### 8. Documentation
- Setup guide: Azure Bot registration, env vars, Hermes config
- Usage examples: echo bot, tool-calling agent on Teams
- Add to Hermes's messaging docs alongside Discord/Slack/Telegram

## Key Challenges

1. **Server model mismatch**: Hermes adapters typically connect outbound (WebSocket/polling) to platforms. Teams uses inbound webhooks — the adapter must **run an HTTP server**. This is similar to Hermes's existing `webhook.py` adapter pattern.

2. **Conversation context**: Bot Framework requires `serviceUrl` + `conversationId` for replies. Must cache these from inbound activities since Hermes's `send()` only receives `chat_id`.

3. **Auth complexity**: Bot Framework has a two-auth model (inbound JWT + outbound OAuth). Botas handles both, but the adapter must wire them correctly.

4. **Teams-specific features**: @mentions, Adaptive Cards, message reactions, file consent — these go beyond basic text messaging. Start with text, add Teams features incrementally.

## Dependencies
- `botas` (Python package) — core Bot Framework protocol
- `botas-fastapi` (Python package) — HTTP server integration
- `uvicorn` — ASGI server
- Hermes Agent — `BasePlatformAdapter`, `MessageEvent`, `SendResult`, gateway config

## Notes
- Hermes already has a `webhook.py` adapter that runs an HTTP server — good reference for the inbound HTTP pattern
- The Slack adapter is the best reference for feature completeness (threads, typing, media)
- Start minimal (text messages in/out), iterate to add Teams-specific features
- Could potentially contribute upstream to NousResearch/hermes-agent as `gateway/platforms/teams.py`
