from __future__ import annotations

import re
from .bot_application import (
    BotApplication,
    BotApplicationOptions,
    BotHandlerError,
    TurnMiddleware,
)
from .turn_context import TurnContext
from .models import (
    CoreActivity,
    ChannelAccount,
    Conversation,
    Entity,
    Attachment,
    ResourceResponse,
    InvokeResponse,
)

__all__ = [
    "BotApplication",
    "BotApplicationOptions",
    "BotHandlerError",
    "TurnMiddleware",
    "TurnContext",
    "CoreActivity",
    "ChannelAccount",
    "Conversation",
    "Entity",
    "Attachment",
    "ResourceResponse",
    "InvokeResponse",
]


class RemoveMentionMiddleware:
    async def on_turn(self, context: TurnContext, next):
        if context.activity.type == "message" and context.activity.text:
            context.activity.text = re.sub(r"<at>\s*</at>", "", context.activity.text)
        await next()