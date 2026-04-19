from typing import TYPE_CHECKING, Any, Union
from .models import CoreActivity, ResourceResponse

if TYPE_CHECKING:
    from .bot_application import BotApplication


class TurnContext:
    def __init__(self, app: "BotApplication", activity: CoreActivity) -> None:
        self._app = app
        self._activity = activity

    @property
    def activity(self) -> CoreActivity:
        return self._activity

    @property
    def app(self) -> "BotApplication":
        return self._app

    @property
    def from_account(self):
        return self._activity.from_account

    async def send(
        self, text_or_activity: Union[str, dict]
    ) -> ResourceResponse | None:
        if isinstance(text_or_activity, str):
            reply = CoreActivity(
                type="message",
                text=text_or_activity,
                from_account=self._activity.recipient,
                recipient=self._activity.from_account,
                conversation=self._activity.conversation,
            )
        else:
            reply = CoreActivity(**text_or_activity)
            reply.service_url = reply.service_url or self._activity.service_url
            reply.conversation = reply.conversation or self._activity.conversation
            reply.from_account = reply.from_account or self._activity.recipient
            reply.recipient = reply.recipient or self._activity.from_account

        return await self._app.send_activity_async(
            self._activity.service_url, self._activity.conversation.id, reply
        )

    async def send_typing(self) -> None:
        typing = CoreActivity(
            type="typing",
            from_account=self._activity.recipient,
            recipient=self._activity.from_account,
            conversation=self._activity.conversation,
        )
        await self._app.send_activity_async(
            self._activity.service_url, self._activity.conversation.id, typing
        )