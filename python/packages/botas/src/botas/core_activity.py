from typing import Any, List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ChannelAccount(BaseModel):
    model_config = ConfigDict(extra='allow')
    id: str
    name: Optional[str] = None
    aad_object_id: Optional[str] = Field(default=None, alias='aadObjectId')
    role: Optional[str] = None

class Conversation(BaseModel):
    model_config = ConfigDict(extra='allow')
    id: str

class CoreActivity(BaseModel):
    model_config = ConfigDict(extra='allow', populate_by_name=True)
    type: str = "message"
    id: Optional[str] = None
    service_url: str = Field(alias='serviceUrl')
    channel_id: Optional[str] = Field(default=None, alias='channelId')
    text: Optional[str] = None
    name: Optional[str] = None
    value: Optional[Any] = None
    from_account: ChannelAccount = Field(alias='from')
    recipient: ChannelAccount
    conversation: Conversation
    entities: Optional[List[Any]] = None
    attachments: Optional[List[Any]] = None
    
    # Internal flag, not serialized
    is_targeted: bool = Field(default=False, exclude=True)

class ResourceResponse(BaseModel):
    id: str

class InvokeResponse(BaseModel):
    status: int
    body: Optional[Any] = None
