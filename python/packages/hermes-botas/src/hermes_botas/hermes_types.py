"""Minimal stubs for Hermes Agent types.

In the real hermes-agent repo (NousResearch/hermes-agent), these types live in:
  - gateway/platforms/base.py  (BasePlatformAdapter, PlatformConfig)
  - gateway/events.py          (MessageEvent, SendResult, SessionSource)
  - gateway/platforms/types.py  (Platform, MessageType)

These stubs provide just enough structure to type-check and run the TeamsAdapter
without adding hermes-agent as a dependency. When contributing upstream, replace
imports from this module with the real hermes-agent imports.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Awaitable, Callable, Optional


class Platform(Enum):
    """Messaging platform identifiers."""

    DISCORD = "discord"
    TELEGRAM = "telegram"
    SLACK = "slack"
    WHATSAPP = "whatsapp"
    TEAMS = "teams"


class MessageType(Enum):
    """Types of messages the adapter can receive/send."""

    TEXT = "text"
    PHOTO = "photo"
    VIDEO = "video"
    AUDIO = "audio"
    DOCUMENT = "document"
    STICKER = "sticker"
    COMMAND = "command"


@dataclass
class PlatformConfig:
    """Configuration for a platform adapter."""

    enabled: bool = True
    token: Optional[str] = None


@dataclass
class SessionSource:
    """Identifies the origin of a message for session routing."""

    platform: Platform
    chat_id: str
    chat_name: Optional[str] = None
    chat_type: str = "dm"
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    thread_id: Optional[str] = None


@dataclass
class MessageEvent:
    """An inbound message event from a platform."""

    text: str
    message_type: MessageType = MessageType.TEXT
    source: Optional[SessionSource] = None
    raw_message: Any = None
    message_id: Optional[str] = None
    media_urls: list[str] = field(default_factory=list)
    media_types: list[str] = field(default_factory=list)
    reply_to_message_id: Optional[str] = None
    reply_to_text: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class SendResult:
    """Result of sending a message to a platform."""

    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
    raw_response: Any = None


# Type alias for the message handler callback set by the Hermes gateway.
MessageHandler = Callable[[MessageEvent], Awaitable[None]]


class BasePlatformAdapter:
    """Base class for Hermes platform adapters.

    In the real hermes-agent repo this is an ABC with abstract methods.
    This stub provides the interface contract and default plumbing that
    concrete adapters (like TeamsAdapter) build on.
    """

    def __init__(self, config: PlatformConfig, platform: Platform) -> None:
        self.config = config
        self.platform = platform
        self._message_handler: Optional[MessageHandler] = None
        self._running = False

    def set_message_handler(self, handler: MessageHandler) -> None:
        """Called by the Hermes gateway to wire up the message callback."""
        self._message_handler = handler

    async def handle_message(self, event: MessageEvent) -> None:
        """Dispatch an inbound message to the gateway's handler."""
        if self._message_handler:
            await self._message_handler(event)

    def build_source(
        self,
        chat_id: str,
        chat_name: Optional[str] = None,
        chat_type: str = "dm",
        user_id: Optional[str] = None,
        user_name: Optional[str] = None,
        thread_id: Optional[str] = None,
    ) -> SessionSource:
        """Build a SessionSource for message routing."""
        return SessionSource(
            platform=self.platform,
            chat_id=chat_id,
            chat_name=chat_name,
            chat_type=chat_type,
            user_id=user_id,
            user_name=user_name,
            thread_id=thread_id,
        )

    async def connect(self) -> bool:
        """Start receiving messages. Return True on success."""
        raise NotImplementedError

    async def disconnect(self) -> None:
        """Stop listeners and close connections."""
        raise NotImplementedError

    async def send(
        self,
        chat_id: str,
        content: str,
        reply_to: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> SendResult:
        """Send a text message to a chat."""
        raise NotImplementedError

    async def get_chat_info(self, chat_id: str) -> dict[str, Any]:
        """Return basic info about a chat: {name, type, chat_id}."""
        raise NotImplementedError

    async def send_typing(self, chat_id: str, metadata: Optional[dict[str, Any]] = None) -> None:
        """Send a typing indicator (optional override)."""
        pass

    async def send_image(
        self,
        chat_id: str,
        image_url: str,
        caption: Optional[str] = None,
        reply_to: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> SendResult:
        """Send an image message (optional override)."""
        return SendResult(success=False, error="Not implemented")

    async def edit_message(
        self,
        chat_id: str,
        message_id: str,
        content: str,
        *,
        finalize: bool = False,
    ) -> SendResult:
        """Edit an existing message (optional override)."""
        return SendResult(success=False, error="Not implemented")
