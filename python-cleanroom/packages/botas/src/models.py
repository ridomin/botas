from __future__ import annotations
from typing import Any, Optional
from pydantic import BaseModel, Field, ConfigDict


class ChannelAccount(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = ""
    name: Optional[str] = None
    aad_object_id: Optional[str] = Field(None, alias="aadObjectId")
    role: Optional[str] = None

    @property
    def from_account(self) -> ChannelAccount:
        return self


class Conversation(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = ""


class Entity(BaseModel):
    type: str = ""
    properties: Optional[dict[str, Any]] = None


class Attachment(BaseModel):
    content_type: Optional[str] = Field(None, alias="contentType")
    content: Optional[Any] = None
    name: Optional[str] = None


class CoreActivity(BaseModel):
    model_config = ConfigDict(extra="allow")

    type: str = "message"
    id: Optional[str] = None
    service_url: str = Field("", alias="serviceUrl")
    channel_id: Optional[str] = Field(None, alias="channelId")
    text: Optional[str] = None
    name: Optional[str] = None
    value: Optional[Any] = None
    from_account: ChannelAccount = Field(default_factory=ChannelAccount, alias="from")
    recipient: ChannelAccount = Field(default_factory=ChannelAccount)
    conversation: Conversation = Field(default_factory=Conversation)
    entities: Optional[list[Entity]] = None
    attachments: Optional[list[Attachment]] = None

    def model_post_init(self, __context: Any) -> None:
        if "from" in self.model_dump(exclude_none=True):
            data = self.model_dump(exclude_none=True).get("from")
            if data and isinstance(data, dict):
                self.from_account = ChannelAccount(**data)


class ResourceResponse(BaseModel):
    id: str = ""


class InvokeResponse(BaseModel):
    status: str = "ok"
    body: Optional[Any] = None