"""Tests for the Hermes Teams adapter."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from botas.core_activity import Attachment, ChannelAccount, Conversation, CoreActivity

from hermes_botas.hermes_types import MessageType, Platform, PlatformConfig
from hermes_botas.teams_adapter import ConversationState, TeamsAdapter, check_teams_requirements

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


def _make_activity(
    *,
    text: str = "Hello",
    conv_id: str = "conv-1",
    service_url: str = "https://smba.trafficmanager.net/amer/",
    from_id: str = "user-1",
    from_name: str = "Alice",
    bot_id: str = "bot-1",
    bot_name: str = "TestBot",
    activity_id: str = "act-123",
    attachments: list[Attachment] | None = None,
) -> CoreActivity:
    return CoreActivity(
        type="message",
        text=text,
        id=activity_id,
        service_url=service_url,
        from_account=ChannelAccount(id=from_id, name=from_name),
        recipient=ChannelAccount(id=bot_id, name=bot_name),
        conversation=Conversation(id=conv_id),
        channel_id="msteams",
        attachments=attachments,
    )


@pytest.fixture
def adapter() -> TeamsAdapter:
    """Create a TeamsAdapter with auth disabled (no real server)."""
    config = PlatformConfig(enabled=True)
    return TeamsAdapter(
        config,
        Platform.TEAMS,
        client_id="test-client-id",
        client_secret="test-secret",
        tenant_id="test-tenant",
        port=3999,
        auth=False,
    )


# ---------------------------------------------------------------------------
# check_teams_requirements
# ---------------------------------------------------------------------------


def test_check_teams_requirements():
    assert check_teams_requirements() is True


# ---------------------------------------------------------------------------
# Instantiation
# ---------------------------------------------------------------------------


def test_adapter_instantiation(adapter: TeamsAdapter):
    assert adapter.platform == Platform.TEAMS
    assert adapter._running is False
    assert adapter._conversations == {}
    assert adapter._port == 3999


def test_adapter_defaults_from_env():
    """Env vars are picked up when no explicit args given."""
    with patch.dict(
        "os.environ",
        {
            "TEAMS_CLIENT_ID": "env-id",
            "TEAMS_CLIENT_SECRET": "env-secret",
            "TEAMS_TENANT_ID": "env-tenant",
            "TEAMS_PORT": "4000",
        },
    ):
        a = TeamsAdapter(PlatformConfig())
        assert a._client_id == "env-id"
        assert a._client_secret == "env-secret"
        assert a._tenant_id == "env-tenant"
        assert a._port == 4000


# ---------------------------------------------------------------------------
# CoreActivity → MessageEvent conversion
# ---------------------------------------------------------------------------


def test_activity_to_message_event_text(adapter: TeamsAdapter):
    activity = _make_activity(text="Hello world")
    event = TeamsAdapter.activity_to_message_event(activity)

    assert event.text == "Hello world"
    assert event.message_type == MessageType.TEXT
    assert event.message_id == "act-123"
    assert event.raw_message is activity
    assert event.media_urls == []


def test_activity_to_message_event_with_image(adapter: TeamsAdapter):
    att = Attachment(content_type="image/png", content_url="https://example.com/cat.png")
    activity = _make_activity(text="Look!", attachments=[att])
    event = TeamsAdapter.activity_to_message_event(activity)

    assert event.message_type == MessageType.PHOTO
    assert event.media_urls == ["https://example.com/cat.png"]
    assert event.media_types == ["image/png"]


def test_activity_to_message_event_empty_text():
    activity = _make_activity(text="")
    # Manually set text to None to simulate missing text
    activity.text = None
    event = TeamsAdapter.activity_to_message_event(activity)
    assert event.text == ""


# ---------------------------------------------------------------------------
# Conversation state caching
# ---------------------------------------------------------------------------


def test_cache_conversation(adapter: TeamsAdapter):
    activity = _make_activity(conv_id="conv-abc", service_url="https://smba.trafficmanager.net/amer/")
    adapter._cache_conversation(activity)

    assert "conv-abc" in adapter._conversations
    state = adapter._conversations["conv-abc"]
    assert state.service_url == "https://smba.trafficmanager.net/amer/"
    assert state.conversation_id == "conv-abc"
    assert state.bot_id == "bot-1"


def test_cache_conversation_updates(adapter: TeamsAdapter):
    """Later activity from same conversation updates the cached state."""
    activity1 = _make_activity(conv_id="conv-1", service_url="https://url-1/")
    activity2 = _make_activity(conv_id="conv-1", service_url="https://url-2/")

    adapter._cache_conversation(activity1)
    adapter._cache_conversation(activity2)

    assert adapter._conversations["conv-1"].service_url == "https://url-2/"


# ---------------------------------------------------------------------------
# send() uses cached state
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_no_cached_state(adapter: TeamsAdapter):
    result = await adapter.send("unknown-conv", "Hello")
    assert result.success is False
    assert "No cached state" in (result.error or "")


@pytest.mark.asyncio
async def test_send_uses_cached_state(adapter: TeamsAdapter):
    adapter._conversations["conv-1"] = ConversationState(
        service_url="https://smba.trafficmanager.net/amer/",
        conversation_id="conv-1",
    )

    mock_response = MagicMock()
    mock_response.id = "sent-act-1"

    with patch.object(adapter._bot_app, "send_activity_async", new_callable=AsyncMock, return_value=mock_response):
        result = await adapter.send("conv-1", "Hi there")

    assert result.success is True
    assert result.message_id == "sent-act-1"


@pytest.mark.asyncio
async def test_send_truncates_long_message(adapter: TeamsAdapter):
    adapter._conversations["conv-1"] = ConversationState(
        service_url="https://smba.trafficmanager.net/amer/",
        conversation_id="conv-1",
    )

    long_text = "x" * 30000

    with patch.object(adapter._bot_app, "send_activity_async", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = MagicMock(id="sent-1")
        await adapter.send("conv-1", long_text)

        sent_activity = mock_send.call_args[0][2]
        assert len(sent_activity["text"]) < 30000
        assert "[Message truncated]" in sent_activity["text"]


# ---------------------------------------------------------------------------
# send_typing()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_send_typing_no_state(adapter: TeamsAdapter):
    # Should silently return, no error
    await adapter.send_typing("unknown-conv")


@pytest.mark.asyncio
async def test_send_typing_with_state(adapter: TeamsAdapter):
    adapter._conversations["conv-1"] = ConversationState(
        service_url="https://smba.trafficmanager.net/amer/",
        conversation_id="conv-1",
    )

    with patch.object(adapter._bot_app, "send_activity_async", new_callable=AsyncMock) as mock_send:
        await adapter.send_typing("conv-1")

        mock_send.assert_called_once()
        sent = mock_send.call_args[0][2]
        assert sent["type"] == "typing"


# ---------------------------------------------------------------------------
# edit_message()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_edit_message_no_state(adapter: TeamsAdapter):
    result = await adapter.edit_message("unknown", "msg-1", "new text")
    assert result.success is False


@pytest.mark.asyncio
async def test_edit_message_with_state(adapter: TeamsAdapter):
    adapter._conversations["conv-1"] = ConversationState(
        service_url="https://smba.trafficmanager.net/amer/",
        conversation_id="conv-1",
    )

    with patch.object(adapter._bot_app, "send_activity_async", new_callable=AsyncMock) as mock_send:
        mock_send.return_value = MagicMock(id="msg-1")
        result = await adapter.edit_message("conv-1", "msg-1", "edited text")

    assert result.success is True
    assert result.message_id == "msg-1"
    sent = mock_send.call_args[0][2]
    assert sent["id"] == "msg-1"
    assert sent["text"] == "edited text"


# ---------------------------------------------------------------------------
# get_chat_info()
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_chat_info_unknown(adapter: TeamsAdapter):
    info = await adapter.get_chat_info("conv-123")
    assert info["chat_id"] == "conv-123"
    assert info["service_url"] is None


@pytest.mark.asyncio
async def test_get_chat_info_cached(adapter: TeamsAdapter):
    adapter._conversations["conv-1"] = ConversationState(
        service_url="https://smba.trafficmanager.net/amer/",
        conversation_id="conv-1",
    )
    info = await adapter.get_chat_info("conv-1")
    assert info["service_url"] == "https://smba.trafficmanager.net/amer/"


# ---------------------------------------------------------------------------
# Inbound message handler integration
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_inbound_message_calls_hermes_handler(adapter: TeamsAdapter):
    handler = AsyncMock()
    adapter.set_message_handler(handler)

    activity = _make_activity(text="Hi from Teams")
    ctx = MagicMock()
    ctx.activity = activity

    await adapter._handle_inbound_message(ctx)

    handler.assert_called_once()
    event = handler.call_args[0][0]
    assert event.text == "Hi from Teams"
    assert event.source.platform == Platform.TEAMS
    assert event.source.user_name == "Alice"


@pytest.mark.asyncio
async def test_inbound_message_caches_conversation(adapter: TeamsAdapter):
    adapter.set_message_handler(AsyncMock())

    activity = _make_activity(conv_id="conv-new", service_url="https://smba.trafficmanager.net/emea/")
    ctx = MagicMock()
    ctx.activity = activity

    await adapter._handle_inbound_message(ctx)

    assert "conv-new" in adapter._conversations
    assert adapter._conversations["conv-new"].service_url == "https://smba.trafficmanager.net/emea/"
