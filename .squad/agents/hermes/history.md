# Project Context

- **Owner:** Rido
- **Project:** botas — multi-language Bot Framework library (.NET, Node.js, Python)
- **Stack:** C#/.NET, TypeScript/Node.js, Python — ASP.NET Core, Express, Hono, aiohttp, FastAPI
- **Created:** 2026-04-13

## Core Context

### Key Files

- `python/packages/botas/src/botas/` — Core library (bot_application.py, bot_auth.py, middleware, turn_context.py)
- `python/packages/botas/src/botas/remove_mention_middleware.py` — Strip bot mentions from activity text
- `python/packages/botas-fastapi/` — FastAPI framework adapter (separate package, PR #48 merged)
- `python/samples/` — Sample bots (echo-bot, fastapi, aiohttp, teams-sample)
- `python/AUDIT.md` — Security audit findings (critical AsyncClient resource leak, P1 fixes merged)

### Patterns & Conventions

- **Middleware protocol:** `ITurnMiddleware` is a `Protocol` with `on_turn_async(context, next)`, registered via `bot.use()`
- **Entity extra fields:** Entity model uses `extra="allow"` — access mention fields via `entity.model_dump(by_alias=True)`
- **Bot identity:** `context.app.appid` (client ID) or `activity.recipient` (channel account) for mention matching
- **Typing activity:** `send_typing() -> None` (ephemeral, no ResourceResponse); decorator-capable `on_typing(handler)`
- **FluentCards:** Adaptive Cards use `fluent-cards` PyPI with `AdaptiveCardBuilder` + `to_json(card)` → JSON string
- **Linting:** ruff (E, F, W, I rules, 120-char line length) — always run before commit

### Resolved Issues

- **RemoveMentionMiddleware parity:** Implemented Python version; case-insensitive ID/text matching, removed name-based check
- **P1 security fixes:** Auth error sanitization, JWKS timeout (10s), body size limit (1MB), SSRF prevention, malformed JSON handling
- **P2/umbrella fixes:** Resource cleanup, type hints, Python version alignment (>=3.12), async context manager patterns
- **Typing activity:** Implemented `on_typing()` + `send_typing()` following approved API spec
- **FastAPI decoupling:** `botas-fastapi` now separate package; PR #48 merged with `bot_auth_dependency` test coverage
- **FluentCards adoption:** Refactored teams-sample (cross-language parity with .NET, Node.js)

### Current State

- **Test coverage:** 94 tests pass (48 core + 46 FastAPI); P1 security tests included
- **Build status:** Python 3.12+ required, ruff clean, all samples verified
- **Latest work:** FluentCards adoption complete, documentation reviews passed
- **Package status:** `botas` and `botas-fastapi` both on PyPI; `build-all.sh` installs both

## Learnings

<!-- Append new learnings below. Each entry is something lasting about the project. -->

- Entity field access requires `model_dump(by_alias=True)` for proper alias expansion
- Pydantic v2 `extra="allow"` enables flexible schema handling without breaking validation
- Async context managers critical for resource cleanup in long-running servers
- Extra fields on CoreActivity (membersAdded, reactionsAdded, action) use original JSON camelCase keys via Pydantic extra="allow"; access with `getattr(activity, "membersAdded", None)` — they're raw dicts/lists, not typed models

### API Documentation — Google-style Docstrings (2026-04-22)
- **Added Google-style docstrings to all 12 public Python files** in `python/packages/botas/src/botas/` per user directive (Rido, 2026-04-22T21:27).
- **Files documented:**
  - Core API: `bot_application.py`, `bot_app.py`, `turn_context.py`
  - Models: `core_activity.py`, `core_activity_builder.py`, `channel_account.py`, `attachment.py`
  - Utilities: `conversation_client.py`, `remove_mention_middleware.py`, `iturn_middleware.py`, `bot_handler_exception.py`, `auth.py`
- **Style:** Google-style docstrings with Args, Returns, Raises sections
- **Impact:** API documented for PyCharm IDE tooltips; pdoc can generate HTML reference docs
- **Cross-language coordination:** .NET (XML) and Node.js (JSDoc) also documented in parallel session
- **Test status:** All 95 tests pass; ruff lint clean
- **PR:** #225 (consolidated with Amy/Fry docs) — Fixes #224

- PR #221: Added conversationUpdate, messageReaction, typing, installationUpdate handlers to Python teams-sample (issue #218)
- Issue #224: Added Google-style docstrings to all public classes, methods, and functions in `python/packages/botas/src/botas/` (12 files, ~920 lines of docs). Branch `squad/224-python-api-docs`.

### Python API Doc Generation with Markdown (2026-04-24)
- **Created generate_python_md_docs.py** — Custom script using pdoc's Python API to generate VitePress-compatible markdown
- **Tool evaluation:**
  - pdoc v15+ generates HTML by default (not markdown files)
  - mkdocstrings requires MkDocs integration (not standalone)
  - pydoc-markdown installed but CLI interface limited
  - **Solution:** Custom script using pdoc.doc.Module API directly
- **Implementation:**
  - Extracts classes, methods, properties, functions from Python modules
  - Generates one .md file per module with cross-links
  - Handles both `botas` (13 modules) and `botas-fastapi` (3 modules)
  - Type annotations preserved (e.g., `botas.core_activity.CoreActivity`)
  - Cross-linking attempted for botas types (partial success)
- **Integration:**
  - Script lives in `docs-site/scripts/generate_python_md_docs.py`
  - Updated `docs-site/generate-api-docs.sh` to call script for both packages
  - Output to `docs-site/api/generated/python/botas/` and `botas-fastapi/`
  - Added to VitePress sidebar under "API Reference (Generated)"
  - Generated files are gitignored (built at doc-generation time)
- **Windows encoding fix:** Removed Unicode emoji/checkmarks to avoid cp1252 errors
- **Status:** Committed on branch `fix/api-docs-package-names` (PR #227)
- **Test coverage:** All 95 Python tests pass; ruff clean

### Hermes Teams Adapter Prototype (hermes-botas package)
- **New package:** `python/packages/hermes-botas/` — Hermes `BasePlatformAdapter` subclass bridging Teams via botas
- **Architecture:** Inbound uses botas-fastapi BotApp HTTP server → activity handler → MessageEvent conversion → Hermes handler. Outbound uses cached conversation state (service_url + conversation_id) → BotApp.send_activity_async().
- **Key design decision:** Hermes types stubbed locally in `hermes_types.py` instead of depending on hermes-agent. This keeps the package self-contained for prototyping while being easy to port upstream (just swap imports).
- **Conversation state caching:** service_url is cached per conversation_id on inbound activities, since Hermes's send() only receives chat_id — the Bot Framework requires both service_url and conversation_id for outbound calls.
- **Server lifecycle:** connect() starts uvicorn in an asyncio background task (non-blocking); disconnect() signals server shutdown.
- **Tests:** 19 unit tests covering activity→MessageEvent conversion, conversation caching, send/typing/edit with mocked BotApp, env var defaults, handler integration.
- **Linting:** ruff clean (E/F/W/I, 120 line-length), follows botas-fastapi pyproject.toml pattern.
- **Files:** `hermes_types.py` (stubs), `teams_adapter.py` (adapter), `test_teams_adapter.py` (19 tests), `README.md`, `pyproject.toml`
