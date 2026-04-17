from typing import Any, Optional, Dict
from .core_activity import CoreActivity, ChannelAccount
from .core_activity_builder import CoreActivityBuilder
from .turn_context import TurnContext
from .bot_application import NextTurn

class TeamsActivityBuilder(CoreActivityBuilder):
    def __init__(self):
        super().__init__()
        self.teams_activity_data: Dict[str, Any] = {}

    def with_channel_data(self, channel_data: Dict[str, Any]) -> "TeamsActivityBuilder":
        self.teams_activity_data["channelData"] = channel_data
        return self

    def add_mention(self, mentioned: ChannelAccount, text: Optional[str] = None) -> "TeamsActivityBuilder":
        mention_text = text or f"<at>{mentioned.name or 'User'}</at>"
        current_text = self.activity_data.get("text", "")
        self.with_text(f"{current_text} {mention_text}".strip())
        
        self.add_entity({
            "type": "mention",
            "mentioned": mentioned.model_dump(by_alias=True),
            "text": mention_text
        })
        return self

    def add_adaptive_card_attachment(self, card: Any) -> "TeamsActivityBuilder":
        self.add_attachment({
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": card
        })
        return self

    def with_suggested_actions(self, suggested_actions: Dict[str, Any]) -> "TeamsActivityBuilder":
        self.teams_activity_data["suggestedActions"] = suggested_actions
        return self

    def build(self) -> CoreActivity:
        activity = super().build()
        # Merge Teams specific data
        data = activity.model_dump(by_alias=True)
        data.update(self.teams_activity_data)
        final_activity = CoreActivity(**data)
        final_activity.is_targeted = self.is_targeted
        return final_activity

async def remove_mention_middleware(context: TurnContext, next_turn: NextTurn) -> None:
    activity = context.activity
    if activity.type == "message" and activity.text and activity.entities:
        bot_mention = next((
            e for e in activity.entities 
            if e.get("type") == "mention" and e.get("mentioned", {}).get("id") == activity.recipient.id
        ), None)
        
        if bot_mention:
            mention_text = bot_mention.get("text")
            if mention_text:
                activity.text = activity.text.replace(mention_text, "").strip()
    
    await next_turn()
