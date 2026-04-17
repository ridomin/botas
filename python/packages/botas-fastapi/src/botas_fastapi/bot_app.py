import os
import json
import uvicorn
from typing import Optional, Callable, Awaitable, Any
from fastapi import FastAPI, Request, Response, Depends, HTTPException
from botas import BotApplication, BotApplicationOptions, TurnContext, TurnMiddleware, validate_bot_token

class BotApp:
    def __init__(self, options: Optional[BotApplicationOptions] = None):
        self.bot = BotApplication(options)
        self.fastapi = FastAPI()
        self.client_id = (options.client_id if options else None) or os.environ.get("CLIENT_ID")

        # Health check
        @self.fastapi.get("/health")
        async def health():
            return {"status": "ok"}

        @self.fastapi.get("/")
        async def root():
            return f"Bot {self.client_id or 'unknown'} is running"

        @self.fastapi.post("/api/messages")
        async def messages(request: Request):
            # Auth check
            if self.client_id:
                auth_header = request.headers.get("Authorization")
                if not auth_header or not auth_header.startswith("Bearer "):
                    raise HTTPException(status_code=401, detail="Missing Authorization header")
                token = auth_header.split(" ")[1]
                try:
                    await validate_bot_token(token, self.client_id)
                except Exception as e:
                    raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

            body = await request.body()
            response = await self.bot.process_body(body.decode("utf-8"))
            if response:
                return Response(content=json.dumps(response.body), status_code=response.status, media_type="application/json")
            return Response(status_code=200)

    def use(self, middleware: TurnMiddleware) -> "BotApp":
        self.bot.use(middleware)
        return self

    def on(self, activity_type: str, handler: Optional[Callable[[TurnContext], Awaitable[None]]] = None) -> Any:
        return self.bot.on(activity_type, handler)

    def start(self, port: Optional[int] = None):
        p = port or int(os.environ.get("PORT", 3978))
        uvicorn.run(self.fastapi, host="0.0.0.0", port=p)
