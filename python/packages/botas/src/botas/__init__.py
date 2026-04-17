from typing import Any
from .core_activity import CoreActivity, ChannelAccount, Conversation, ResourceResponse, InvokeResponse
from .core_activity_builder import CoreActivityBuilder
from .conversation_client import ConversationClient, BotApplicationOptions
from .turn_context import TurnContext
from .bot_application import BotApplication, BotHandlerException, TurnMiddleware, NextTurn
from .bot_auth import validate_bot_token
from .teams_activity import TeamsActivityBuilder, remove_mention_middleware

# Legacy alias
ITurnMiddleware = Any # Just a type hint placeholder if needed, but TurnMiddleware is a callable protocol in Python
