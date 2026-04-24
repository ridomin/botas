"""Hermes platform adapter for Microsoft Teams via botas.

Bridges the botas Bot Framework library into the Hermes agent platform,
allowing Hermes agents to receive and send messages on Microsoft Teams.

Inbound flow:  Teams → Bot Framework → botas HTTP endpoint → TeamsAdapter → Hermes
Outbound flow: Hermes → TeamsAdapter → botas ConversationClient → Bot Framework → Teams

Usage::

    from hermes_botas.teams_adapter import TeamsAdapter, check_teams_requirements
    from hermes_botas.hermes_types import PlatformConfig, Platform

    config = PlatformConfig(enabled=True)
    adapter = TeamsAdapter(config, Platform.TEAMS)
    adapter.set_message_handler(my_hermes_handler)
    await adapter.connect()

When contributing upstream to NousResearch/hermes-agent, replace the
hermes_types imports with the real hermes-agent module imports.
"""

from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass
from typing import Any, Optional

from botas.core_activity import CoreActivity
from botas.token_manager import BotApplicationOptions
from botas.turn_context import TurnContext
from botas_fastapi.bot_app import BotApp

from hermes_botas.hermes_types import (
    BasePlatformAdapter,
    MessageEvent,
    MessageType,
    Platform,
    PlatformConfig,
    SendResult,
)

logger = logging.getLogger(__name__)

MAX_MESSAGE_LENGTH = 28000
"""Teams message size limit (~28KB)."""


def check_teams_requirements() -> bool:
    """Check whether the Teams adapter dependencies are available.

    Returns True if botas and botas-fastapi are importable.
    Required by Hermes's adapter discovery pattern.
    """
    try:
        import botas  # noqa: F401
        import botas_fastapi  # noqa: F401

        return True
    except ImportError:
        return False


@dataclass
class ConversationState:
    """Cached state for a Bot Framework conversation."""

    service_url: str
    conversation_id: str
    bot_id: Optional[str] = None
    bot_name: Optional[str] = None


class TeamsAdapter(BasePlatformAdapter):
    """Hermes platform adapter for Microsoft Teams.

    Uses botas-fastapi's BotApp to run an HTTP server that receives
    Bot Framework activities and bridges them into Hermes MessageEvents.
    Outbound messages are sent via botas's ConversationClient.
    """

    def __init__(
        self,
        config: PlatformConfig,
        platform: Platform = Platform.TEAMS,
        *,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        tenant_id: Optional[str] = None,
        port: Optional[int] = None,
        auth: Optional[bool] = None,
    ) -> None:
        super().__init__(config, platform)

        self._client_id = client_id or os.environ.get("TEAMS_CLIENT_ID") or os.environ.get("CLIENT_ID")
        self._client_secret = client_secret or os.environ.get("TEAMS_CLIENT_SECRET") or os.environ.get("CLIENT_SECRET")
        self._tenant_id = tenant_id or os.environ.get("TEAMS_TENANT_ID") or os.environ.get("TENANT_ID")
        self._port = port or int(os.environ.get("TEAMS_PORT", os.environ.get("PORT", "3978")))
        self._auth = auth

        options = BotApplicationOptions(
            client_id=self._client_id,
            client_secret=self._client_secret,
            tenant_id=self._tenant_id,
        )
        self._bot_app = BotApp(options, port=self._port, auth=self._auth)

        # Cache: conversation_id → ConversationState
        self._conversations: dict[str, ConversationState] = {}

        # Server task for background uvicorn
        self._server_task: Optional[asyncio.Task[None]] = None
        self._server: Any = None  # uvicorn.Server instance

        self._register_handlers()

    def _register_handlers(self) -> None:
        """Wire up botas activity handlers to bridge into Hermes."""

        @self._bot_app.on("message")
        async def on_message(ctx: TurnContext) -> None:
            await self._handle_inbound_message(ctx)

    def _cache_conversation(self, activity: CoreActivity) -> None:
        """Cache conversation state from an inbound activity."""
        if activity.conversation and activity.service_url:
            conv_id = activity.conversation.id
            self._conversations[conv_id] = ConversationState(
                service_url=activity.service_url,
                conversation_id=conv_id,
                bot_id=activity.recipient.id if activity.recipient else None,
                bot_name=activity.recipient.name if activity.recipient else None,
            )

    @staticmethod
    def activity_to_message_event(activity: CoreActivity, source: Any = None) -> MessageEvent:
        """Convert a botas CoreActivity into a Hermes MessageEvent.

        Args:
            activity: The inbound Bot Framework activity.
            source: A SessionSource for routing (optional).

        Returns:
            A MessageEvent ready for the Hermes gateway.
        """
        # Determine message type from attachments
        message_type = MessageType.TEXT
        media_urls: list[str] = []
        media_types: list[str] = []

        if activity.attachments:
            for att in activity.attachments:
                if att.content_url:
                    media_urls.append(att.content_url)
                    media_types.append(att.content_type)
                    if att.content_type and att.content_type.startswith("image/"):
                        message_type = MessageType.PHOTO

        return MessageEvent(
            text=activity.text or "",
            message_type=message_type,
            source=source,
            raw_message=activity,
            message_id=getattr(activity, "id", None),
            media_urls=media_urls,
            media_types=media_types,
            reply_to_message_id=getattr(activity, "reply_to_id", None),
        )

    async def _handle_inbound_message(self, ctx: TurnContext) -> None:
        """Bridge an inbound botas message to the Hermes handler."""
        activity = ctx.activity
        self._cache_conversation(activity)

        # Determine chat type based on conversation id pattern
        chat_type = "channel" if activity.conversation and ":" in activity.conversation.id else "dm"

        source = self.build_source(
            chat_id=activity.conversation.id if activity.conversation else "",
            chat_name=None,
            chat_type=chat_type,
            user_id=activity.from_account.id if activity.from_account else None,
            user_name=activity.from_account.name if activity.from_account else None,
        )

        event = self.activity_to_message_event(activity, source=source)
        await self.handle_message(event)

    async def connect(self) -> bool:
        """Start the uvicorn HTTP server in a background task."""
        if self._running:
            return True

        try:
            import uvicorn

            app = self._bot_app._build_app()
            config = uvicorn.Config(app, host="0.0.0.0", port=self._port, log_level="info")
            self._server = uvicorn.Server(config)

            self._server_task = asyncio.create_task(self._server.serve())
            self._running = True
            logger.info("Teams adapter connected on port %d", self._port)
            return True
        except Exception:
            logger.exception("Failed to start Teams adapter")
            return False

    async def disconnect(self) -> None:
        """Shut down the uvicorn server."""
        if self._server:
            self._server.should_exit = True
        if self._server_task:
            self._server_task.cancel()
            try:
                await self._server_task
            except asyncio.CancelledError:
                pass
        self._running = False
        logger.info("Teams adapter disconnected")

    async def send(
        self,
        chat_id: str,
        content: str,
        reply_to: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> SendResult:
        """Send a text message to a Teams conversation.

        Args:
            chat_id: The Bot Framework conversation ID.
            content: Message text (truncated to MAX_MESSAGE_LENGTH).
            reply_to: Optional activity ID to reply to.
            metadata: Optional additional fields for the activity.
        """
        state = self._conversations.get(chat_id)
        if not state:
            return SendResult(success=False, error=f"No cached state for conversation {chat_id}")

        # Truncate to Teams limit
        if len(content) > MAX_MESSAGE_LENGTH:
            content = content[:MAX_MESSAGE_LENGTH] + "\n\n[Message truncated]"

        activity_dict: dict[str, Any] = {
            "type": "message",
            "text": content,
        }
        if reply_to:
            activity_dict["replyToId"] = reply_to
        if metadata:
            activity_dict.update(metadata)

        try:
            result = await self._bot_app.send_activity_async(
                state.service_url,
                state.conversation_id,
                activity_dict,
            )
            return SendResult(
                success=True,
                message_id=result.id if result else None,
                raw_response=result,
            )
        except Exception as exc:
            logger.exception("Failed to send message to %s", chat_id)
            return SendResult(success=False, error=str(exc))

    async def get_chat_info(self, chat_id: str) -> dict[str, Any]:
        """Return basic info about a Teams conversation."""
        state = self._conversations.get(chat_id)
        chat_type = "channel" if ":" in chat_id else "dm"
        return {
            "name": chat_id,
            "type": chat_type,
            "chat_id": chat_id,
            "service_url": state.service_url if state else None,
        }

    async def send_typing(self, chat_id: str, metadata: Optional[dict[str, Any]] = None) -> None:
        """Send a typing indicator to a Teams conversation."""
        state = self._conversations.get(chat_id)
        if not state:
            return

        activity_dict: dict[str, Any] = {"type": "typing"}
        try:
            await self._bot_app.send_activity_async(
                state.service_url,
                state.conversation_id,
                activity_dict,
            )
        except Exception:
            logger.exception("Failed to send typing to %s", chat_id)

    async def edit_message(
        self,
        chat_id: str,
        message_id: str,
        content: str,
        *,
        finalize: bool = False,
    ) -> SendResult:
        """Edit an existing message in a Teams conversation.

        Args:
            chat_id: The Bot Framework conversation ID.
            message_id: The activity ID of the message to edit.
            content: New message text.
            finalize: If True, this is the final edit (no streaming indicator).
        """
        state = self._conversations.get(chat_id)
        if not state:
            return SendResult(success=False, error=f"No cached state for conversation {chat_id}")

        if len(content) > MAX_MESSAGE_LENGTH:
            content = content[:MAX_MESSAGE_LENGTH] + "\n\n[Message truncated]"

        activity_dict: dict[str, Any] = {
            "type": "message",
            "id": message_id,
            "text": content,
        }

        try:
            result = await self._bot_app.send_activity_async(
                state.service_url,
                state.conversation_id,
                activity_dict,
            )
            return SendResult(
                success=True,
                message_id=message_id,
                raw_response=result,
            )
        except Exception as exc:
            logger.exception("Failed to edit message %s in %s", message_id, chat_id)
            return SendResult(success=False, error=str(exc))

    async def send_image(
        self,
        chat_id: str,
        image_url: str,
        caption: Optional[str] = None,
        reply_to: Optional[str] = None,
        metadata: Optional[dict[str, Any]] = None,
    ) -> SendResult:
        """Send an image to a Teams conversation.

        Args:
            chat_id: The Bot Framework conversation ID.
            image_url: URL of the image to send.
            caption: Optional text caption.
            reply_to: Optional activity ID to reply to.
            metadata: Optional additional fields.
        """
        state = self._conversations.get(chat_id)
        if not state:
            return SendResult(success=False, error=f"No cached state for conversation {chat_id}")

        activity_dict: dict[str, Any] = {
            "type": "message",
            "text": caption or "",
            "attachments": [
                {
                    "contentType": "image/*",
                    "contentUrl": image_url,
                }
            ],
        }
        if reply_to:
            activity_dict["replyToId"] = reply_to
        if metadata:
            activity_dict.update(metadata)

        try:
            result = await self._bot_app.send_activity_async(
                state.service_url,
                state.conversation_id,
                activity_dict,
            )
            return SendResult(
                success=True,
                message_id=result.id if result else None,
                raw_response=result,
            )
        except Exception as exc:
            logger.exception("Failed to send image to %s", chat_id)
            return SendResult(success=False, error=str(exc))
