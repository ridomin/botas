import json
from typing import Callable, Awaitable, List, Dict, Optional, Any
from .core_activity import CoreActivity, InvokeResponse
from .turn_context import TurnContext
from .conversation_client import ConversationClient, BotApplicationOptions

NextTurn = Callable[[], Awaitable[None]]
TurnMiddleware = Callable[[TurnContext, NextTurn], Awaitable[None]]

class BotHandlerException(Exception):
    def __init__(self, message: str, cause: Exception, activity: CoreActivity):
        super().__init__(message)
        self.cause = cause
        self.activity = activity

class BotApplication:
    def __init__(self, options: Optional[BotApplicationOptions] = None):
        self.options = options or BotApplicationOptions()
        self.conversation_client = ConversationClient(self.options)
        self.middleware: List[TurnMiddleware] = []
        self.handlers: Dict[str, Callable[[TurnContext], Awaitable[None]]] = {}
        self.invoke_handlers: Dict[str, Callable[[TurnContext], Awaitable[InvokeResponse]]] = {}
        self.on_activity: Optional[Callable[[TurnContext], Awaitable[None]]] = None

    def use(self, middleware: TurnMiddleware) -> "BotApplication":
        self.middleware.append(middleware)
        return self

    def on(self, activity_type: str, handler: Optional[Callable[[TurnContext], Awaitable[None]]] = None) -> Any:
        if handler is None:
            def decorator(h: Callable[[TurnContext], Awaitable[None]]):
                self.handlers[activity_type.lower()] = h
                return h
            return decorator
        self.handlers[activity_type.lower()] = handler
        return self

    def on_invoke(self, name: str, handler: Callable[[TurnContext], Awaitable[InvokeResponse]]) -> "BotApplication":
        self.invoke_handlers[name] = handler
        return self

    async def process_body(self, body: str) -> Optional[InvokeResponse]:
        data = json.loads(body)
        activity = CoreActivity(**data)
        
        if not activity.type or not activity.service_url or not activity.conversation.id:
            raise Exception("Invalid activity: missing required fields")

        context = TurnContext(self, activity)
        invoke_response: Optional[InvokeResponse] = None

        async def run_pipeline(index: int) -> None:
            nonlocal invoke_response
            if index < len(self.middleware):
                await self.middleware[index](context, lambda: run_pipeline(index + 1))
            else:
                if self.on_activity:
                    await self.on_activity(context)
                elif activity.type.lower() == "invoke":
                    handler = self.invoke_handlers.get(activity.name or "")
                    if handler:
                        invoke_response = await handler(context)
                else:
                    handler = self.handlers.get(activity.type.lower())
                    if handler:
                        await handler(context)

        try:
            await run_pipeline(0)
        except Exception as e:
            # Re-raise cancellation exceptions as per spec
            # In Python, this is usually asyncio.CancelledError
            import asyncio
            if isinstance(e, asyncio.CancelledError):
                raise
            raise BotHandlerException("Error in bot handler", e, activity)

        return invoke_response
