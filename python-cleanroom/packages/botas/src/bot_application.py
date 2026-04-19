from __future__ import annotations
import json
import os
import time
import base64
import re
from typing import Any, Awaitable, Callable, Optional
from typing_extensions import Protocol, TypeVar

import httpx
import jwt

from .models import CoreActivity, ResourceResponse, InvokeResponse, ChannelAccount, Conversation
from .turn_context import TurnContext


class _BotApplicationBot:
    """BotApplication instance returned by on() for chaining."""
    
    def __init__(self, bot: BotApplication) -> None:
        self._bot = bot
    
    def on(self, activity_type: str, handler):
        self._bot.on(activity_type, handler)
        return self
    
    def use(self, middleware):
        self._bot.use(middleware)
        return self


from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .turn_context import TurnContext


T = TypeVar("T")
NextTurn = Callable[[], Awaitable[None]]


class TurnMiddleware(Protocol):
    async def on_turn(self, context: TurnContext, next: NextTurn) -> None: ...


P = TypeVar("P", bound=TurnMiddleware)


class BotApplication:
    def __init__(
        self,
        options: Optional[BotApplicationOptions] = None,
    ) -> None:
        self._handlers: dict[str, Callable[[TurnContext], Awaitable[None]]] = {}
        self._middleware: list[TurnMiddleware] = []
        self._on_activity: Optional[Callable[[TurnContext], Awaitable[None]]] = None
        self._http_client = httpx.AsyncClient()
        self._outbound_token = ""
        self._token_expiry = 0
        opts = options or BotApplicationOptions()
        self._client_id = opts.client_id or os.getenv("CLIENT_ID", "")
        self._client_secret = opts.client_secret or os.getenv("CLIENT_SECRET", "")
        self._tenant_id = opts.tenant_id or os.getenv("TENANT_ID", "common")

    def on(
        self, activity_type: str, handler: Callable[[TurnContext], Awaitable[None]]
    ) -> "BotApplication":
        self._handlers[activity_type.lower()] = handler
        return self

    @property
    def on_activity(self) -> Optional[Callable[[TurnContext], Awaitable[None]]]:
        return self._on_activity

    @on_activity.setter
    def on_activity(
        self, value: Optional[Callable[[TurnContext], Awaitable[None]]]
    ) -> None:
        self._on_activity = value

    def use(self, middleware: TurnMiddleware) -> "BotApplication":
        self._middleware.append(middleware)
        return self

    async def process_body(self, body: str) -> InvokeResponse | None:
        activity = CoreActivity(**json.loads(body))
        return await self._process_activity(activity)

    async def send_activity_async(
        self,
        service_url: str,
        conversation_id: str,
        activity: CoreActivity,
    ) -> ResourceResponse | None:
        if not service_url or not conversation_id:
            return None

        url = (
            self._normalize_service_url(service_url)
            + "v3/conversations/"
            + self._truncate_conversation_id(conversation_id)
            + "/activities"
        )

        token = await self._get_outbound_token()

        response = await self._http_client.post(
            url,
            json=activity.model_dump(by_alias=True, exclude_none=True),
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
        return ResourceResponse(**response.json())

    async def _process_activity(
        self, activity: CoreActivity
    ) -> InvokeResponse | None:
        if not self._validate_required_fields(activity):
            return InvokeResponse(status="error", body={"error": "invalid activity"})
        if not self._validate_service_url(activity.service_url):
            return InvokeResponse(status="error", body={"error": "invalid serviceUrl"})

        turn_context = TurnContext(self, activity)
        final_handler = lambda: self._dispatch(turn_context)

        await self._run_middleware_pipeline(turn_context, final_handler)
        return InvokeResponse(status="ok")

    async def _run_middleware_pipeline(
        self, context: TurnContext, final_handler: NextTurn
    ) -> None:
        async def run():
            await final_handler()
            return None

        next: NextTurn = run
        for middleware in reversed(self._middleware):
            current_next = next

            async def wrapper(__next: NextTurn, ctx=context, mw=middleware) -> None:
                await mw.on_turn(ctx, __next)

            next = wrapper

        await next()

    async def _dispatch(self, turn_context: TurnContext) -> None:
        handler = self._on_activity
        if not handler:
            handler = self._handlers.get(turn_context.activity.type.lower())  # type: ignore

        if handler:
            try:
                await handler(turn_context)
            except Exception as e:
                raise BotHandlerError(e, turn_context.activity)

    async def _get_outbound_token(self) -> str:
        if self._outbound_token and time.time() < self._token_expiry - 300:
            return self._outbound_token

        token_url = (
            f"https://login.microsoftonline.com/{self._tenant_id}/oauth2/v2.0/token"
        )

        response = await self._http_client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "scope": "https://api.botframework.com/.default",
            },
        )
        result = response.json()
        self._outbound_token = result["access_token"]
        self._token_expiry = time.time() + result["expires_in"]
        return self._outbound_token

    def _validate_token(self, token: str) -> bool:
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return False

            payload = json.loads(
                base64.urlsafe_b64decode(parts[1] + "==").decode()
            )

            aud = payload.get("aud")
            iss = payload.get("iss")
            tid = payload.get("tid")
            exp = payload.get("exp")

            if exp < time.time():
                return False

            valid_audiences = [
                self._client_id,
                f"api://{self._client_id}",
                "https://api.botframework.com",
            ]
            if aud not in valid_audiences:
                return False

            valid_issuers = [
                "https://api.botframework.com",
                f"https://sts.windows.net/{tid}/",
                f"https://login.microsoftonline.com/{tid}/v2",
                f"https://login.microsoftonline.com/{tid}/v2.0",
            ]
            if iss not in valid_issuers:
                return False

            return True
        except Exception:
            return False

    def _validate_required_fields(self, activity: CoreActivity) -> bool:
        return bool(activity.type and activity.service_url and activity.conversation.id)

    def _validate_service_url(self, service_url: str) -> bool:
        try:
            from urllib.parse import urlparse

            parsed = urlparse(service_url)
            host = parsed.netloc.lower()

            if host in ("localhost", "127.0.0.1"):
                return parsed.scheme in ("http", "https")

            allowed_patterns = [
                "botframework.com",
                "botframework.us",
                "botframework.cn",
                "trafficmanager.net",
            ]

            return any(host.endswith(p) for p in allowed_patterns) and parsed.scheme == "https"
        except Exception:
            return False

    def _normalize_service_url(self, service_url: str) -> str:
        service_url = service_url.rstrip("/")
        if not service_url.endswith("/"):
            service_url += "/"
        return service_url

    def _truncate_conversation_id(self, conversation_id: str) -> str:
        semicolon_index = conversation_id.find(";")
        if semicolon_index > 0:
            conversation_id = conversation_id[:semicolon_index]
        return conversation_id

    async def close(self) -> None:
        await self._http_client.aclose()


class BotApplicationOptions:
    def __init__(
        self,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        tenant_id: Optional[str] = None,
        managed_identity_client_id: Optional[str] = None,
        token_factory: Optional[Callable[[str, str], Awaitable[str]]] = None,
    ) -> None:
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.managed_identity_client_id = managed_identity_client_id
        self.token_factory = token_factory


class BotHandlerError(Exception):
    def __init__(self, cause: Exception, activity: CoreActivity) -> None:
        super().__init__("Handler error")
        self.cause = cause
        self.activity = activity