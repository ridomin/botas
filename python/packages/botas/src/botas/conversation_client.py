import os
import time
import httpx
from typing import Optional, Dict, Any, Callable, Awaitable
from pydantic import BaseModel
from .core_activity import CoreActivity, ResourceResponse

class BotApplicationOptions(BaseModel):
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None
    managed_identity_client_id: Optional[str] = None
    token_factory: Optional[Callable[[str, str], Awaitable[str]]] = None

class TokenManager:
    def __init__(self, options: BotApplicationOptions):
        self.options = options
        self.cache: Dict[str, Dict[str, Any]] = {}

    async def get_token(self, scope: str, tenant_id: str = "common") -> Optional[str]:
        if self.options.token_factory:
            return await self.options.token_factory(scope, tenant_id)

        client_id = self.options.client_id or os.environ.get("CLIENT_ID")
        client_secret = self.options.client_secret or os.environ.get("CLIENT_SECRET")
        tenant = self.options.tenant_id or os.environ.get("TENANT_ID") or tenant_id

        if not client_id or not client_secret:
            return None

        cache_key = f"{client_id}:{tenant}:{scope}"
        cached = self.cache.get(cache_key)
        if cached and cached["expires"] > time.time() + 60:
            return cached["token"]

        url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
        data = {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": scope,
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(url, data=data)
            if response.status_code != 200:
                raise Exception(f"Failed to acquire token: {response.status_code} {response.text}")
            
            res_data = response.json()
            token = res_data["access_token"]
            expires = time.time() + res_data["expires_in"]
            self.cache[cache_key] = {"token": token, "expires": expires}
            return token

class ConversationClient:
    def __init__(self, options: BotApplicationOptions):
        self.token_manager = TokenManager(options)

    async def send_core_activity_async(
        self, service_url: str, conversation_id: str, activity: CoreActivity
    ) -> ResourceResponse:
        base_url = service_url if service_url.endswith("/") else f"{service_url}/"
        url_safe_conv_id = conversation_id.split(";")[0]
        url = f"{base_url}v3/conversations/{httpx.utils.quote(url_safe_conv_id)}/activities"

        if activity.is_targeted:
            url += "?isTargetedActivity=true"

        token = await self.token_manager.get_token("https://api.botframework.com/.default")
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient() as client:
            # Pydantic's model_dump handles aliases and exclusion of is_targeted
            response = await client.post(url, json=activity.model_dump(by_alias=True), headers=headers)
            if response.status_code not in (200, 201, 202):
                raise Exception(f"Failed to send activity: {response.status_code} {response.text}")
            
            return ResourceResponse(**response.json())

    async def add_reaction_async(
        self, service_url: str, conversation_id: str, activity_id: str, reaction_type: str
    ) -> None:
        base_url = service_url if service_url.endswith("/") else f"{service_url}/"
        url_safe_conv_id = conversation_id.split(";")[0]
        url = f"{base_url}v3/conversations/{httpx.utils.quote(url_safe_conv_id)}/activities/{httpx.utils.quote(activity_id)}/reactions"

        token = await self.token_manager.get_token("https://api.botframework.com/.default")
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"

        async with httpx.AsyncClient() as client:
            response = await client.post(url, json={"type": reaction_type}, headers=headers)
            if response.status_code not in (200, 201, 202):
                raise Exception(f"Failed to add reaction: {response.status_code} {response.text}")
