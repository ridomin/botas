from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Callable, Awaitable

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from botas import BotApplication, TurnContext


class BotApp:
    def __init__(self) -> None:
        self._bot = BotApplication()
        self._app = FastAPI()

    def on(
        self, activity_type: str, handler: Callable[[TurnContext], Awaitable[None]]
    ) -> "BotApp":
        self._bot.on(activity_type, handler)
        return self

    def use(self, middleware) -> "BotApp":
        self._bot.use(middleware)
        return self

    @property
    def on_activity(self) -> Callable[[TurnContext], Awaitable[None]] | None:
        return self._bot.on_activity

    @on_activity.setter
    def on_activity(
        self, value: Callable[[TurnContext], Awaitable[None]] | None
    ) -> None:
        self._bot.on_activity = value

    def start(self) -> FastAPI:
        @self._app.get("/")
        async def root():
            client_id = os.getenv("CLIENT_ID")
            return f"Bot {client_id or '(no auth)'} is running"

        @self._app.get("/health")
        async def health():
            return JSONResponse({"status": "ok"})

        @self._app.post("/api/messages")
        async def messages(request: Request):
            body = await request.body()
            await self._bot.process_body(body.decode())
            return JSONResponse({})

        return self._app


app = BotApp()