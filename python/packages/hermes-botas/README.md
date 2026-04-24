# hermes-botas

**Hermes platform adapter for Microsoft Teams**, powered by the [botas](https://github.com/rido-min/botas) Bot Framework library.

This package bridges Microsoft Teams into the [Hermes Agent](https://github.com/NousResearch/hermes-agent) platform, allowing Hermes agents to natively receive and send messages on Teams — alongside Discord, Slack, and Telegram.

> **Status:** Prototype — intended for upstream contribution to NousResearch/hermes-agent as `gateway/platforms/teams.py`.

## How it works

```
Teams User ←→ Bot Framework Service ←→ [HTTP /api/messages] ←→ TeamsAdapter ←→ Hermes Agent
                                         (botas handles JWT/OAuth)
```

- **Inbound:** botas receives Bot Framework activities via HTTP webhook, validates JWT tokens, and dispatches them. The `TeamsAdapter` converts `CoreActivity` → `MessageEvent` and passes it to the Hermes message handler.
- **Outbound:** When Hermes calls `adapter.send(chat_id, text)`, the adapter uses cached conversation state and botas's `ConversationClient` to send messages back through the Bot Framework REST API.

## Installation

```bash
pip install hermes-botas
```

Or for local development:

```bash
cd python/packages/hermes-botas
pip install -e ".[dev]"
```

## Configuration

Set these environment variables (or pass them to the constructor):

| Variable | Description |
|---|---|
| `TEAMS_CLIENT_ID` / `CLIENT_ID` | Azure AD application (bot) ID |
| `TEAMS_CLIENT_SECRET` / `CLIENT_SECRET` | Azure AD client secret |
| `TEAMS_TENANT_ID` / `TENANT_ID` | Azure AD tenant ID |
| `TEAMS_PORT` / `PORT` | HTTP listen port (default: 3978) |

See [specs/setup.md](../../specs/setup.md) for Azure Bot registration instructions.

## Usage

```python
import asyncio
from hermes_botas import TeamsAdapter, PlatformConfig, Platform, MessageEvent

async def my_handler(event: MessageEvent):
    print(f"[{event.source.user_name}]: {event.text}")

async def main():
    config = PlatformConfig(enabled=True)
    adapter = TeamsAdapter(config, Platform.TEAMS)
    adapter.set_message_handler(my_handler)
    await adapter.connect()

    # Keep running...
    try:
        await asyncio.Event().wait()
    finally:
        await adapter.disconnect()

asyncio.run(main())
```

## For upstream contribution

This package includes minimal type stubs in `hermes_types.py` that mirror the Hermes agent interfaces (`BasePlatformAdapter`, `MessageEvent`, `SendResult`, etc.). When contributing to the hermes-agent repo:

1. Copy `teams_adapter.py` to `gateway/platforms/teams.py`
2. Replace `from hermes_botas.hermes_types import ...` with the real hermes-agent imports
3. Add `botas` and `botas-fastapi` to the hermes-agent dependencies

## Development

```bash
cd python/packages/hermes-botas
pip install -e ".[dev]"
python -m pytest tests/ -v
python -m ruff check --fix src/ tests/
python -m ruff format src/ tests/
```
