from typing import Union, Optional, TYPE_CHECKING
from .core_activity import CoreActivity, ResourceResponse, ChannelAccount, Conversation

if TYPE_CHECKING:
    from .bot_application import BotApplication

EMOJI_MAP = {
    "👍": "like",
    "❤️": "heart",
    "😂": "laugh",
    "😮": "surprised",
    "😢": "sad",
    "😠": "angry",
}

class TurnContext:
    def __init__(self, app: "BotApplication", activity: CoreActivity):
        self.app = app
        self.activity = activity

    async def send(self, text_or_activity: Union[str, CoreActivity, dict]) -> ResourceResponse:
        if isinstance(text_or_activity, str):
            reply = CoreActivity(
                type="message",
                text=text_or_activity,
                serviceUrl=self.activity.service_url,
                from_account=self.activity.recipient,
                recipient=self.activity.from_account,
                conversation=self.activity.conversation,
            )
        elif isinstance(text_or_activity, dict):
            # Merge with defaults
            data = {
                "type": "message",
                "serviceUrl": self.activity.service_url,
                "from": self.activity.recipient.model_dump(by_alias=True),
                "recipient": self.activity.from_account.model_dump(by_alias=True),
                "conversation": self.activity.conversation.model_dump(by_alias=True),
                **text_or_activity
            }
            reply = CoreActivity(**data)
        else:
            reply = text_or_activity
            if not reply.service_url: reply.service_url = self.activity.service_url
            if not reply.conversation.id: reply.conversation = self.activity.conversation
            if not reply.from_account.id: reply.from_account = self.activity.recipient
            if not reply.recipient.id: reply.recipient = self.activity.from_account

        return await self.app.conversation_client.send_core_activity_async(
            reply.service_url, reply.conversation.id, reply
        )

    async def send_typing(self) -> None:
        await self.send({"type": "typing"})

    async def send_targeted(self, text: str, recipient: ChannelAccount) -> ResourceResponse:
        return await self.send({
            "type": "message",
            "text": text,
            "recipient": recipient.model_dump(by_alias=True),
            "is_targeted": True
        })

    async def add_reaction(self, emoji_or_type: str) -> None:
        reaction_type = EMOJI_MAP.get(emoji_or_type, emoji_or_type)
        if not self.activity.id:
            raise Exception("Cannot add reaction: incoming activity has no id")
        
        await self.app.conversation_client.add_reaction_async(
            self.activity.service_url,
            self.activity.conversation.id,
            self.activity.id,
            reaction_type
        )
