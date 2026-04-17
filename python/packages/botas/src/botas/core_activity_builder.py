from typing import Any, List, Optional, Dict
from .core_activity import CoreActivity, ChannelAccount, Conversation

class CoreActivityBuilder:
    def __init__(self):
        self.activity_data: Dict[str, Any] = {
            "type": "message",
            "entities": [],
            "attachments": []
        }
        self.is_targeted = False

    def with_type(self, activity_type: str) -> "CoreActivityBuilder":
        self.activity_data["type"] = activity_type
        return self

    def with_text(self, text: str) -> "CoreActivityBuilder":
        self.activity_data["text"] = text
        return self

    def with_recipient(self, recipient: ChannelAccount, is_targeted: bool = False) -> "CoreActivityBuilder":
        self.activity_data["recipient"] = recipient.model_dump(by_alias=True)
        self.is_targeted = is_targeted
        return self

    def with_from(self, from_account: ChannelAccount) -> "CoreActivityBuilder":
        self.activity_data["from"] = from_account.model_dump(by_alias=True)
        return self

    def with_conversation(self, conversation: Conversation) -> "CoreActivityBuilder":
        self.activity_data["conversation"] = conversation.model_dump(by_alias=True)
        return self

    def with_service_url(self, service_url: str) -> "CoreActivityBuilder":
        self.activity_data["serviceUrl"] = service_url
        return self

    def with_conversation_reference(self, reference: CoreActivity) -> "CoreActivityBuilder":
        self.activity_data["serviceUrl"] = reference.service_url
        self.activity_data["conversation"] = reference.conversation.model_dump(by_alias=True)
        self.activity_data["from"] = reference.recipient.model_dump(by_alias=True)
        self.activity_data["recipient"] = reference.from_account.model_dump(by_alias=True)
        self.activity_data["channelId"] = reference.channel_id
        return self

    def add_entity(self, entity: Any) -> "CoreActivityBuilder":
        self.activity_data["entities"].append(entity)
        return self

    def add_attachment(self, attachment: Any) -> "CoreActivityBuilder":
        self.activity_data["attachments"].append(attachment)
        return self

    def with_value(self, value: Any) -> "CoreActivityBuilder":
        self.activity_data["value"] = value
        return self

    def with_name(self, name: str) -> "CoreActivityBuilder":
        self.activity_data["name"] = name
        return self

    def build(self) -> CoreActivity:
        activity = CoreActivity(**self.activity_data)
        activity.is_targeted = self.is_targeted
        return activity
