import asyncio
from hermes_botas import TeamsAdapter, PlatformConfig, Platform, MessageEvent

async def my_handler(event: MessageEvent):
    print(f"[{event.source.user_name}]: {event.text}")

async def main():
    config = PlatformConfig(enabled=True)
    adapter = TeamsAdapter(config, Platform.TEAMS)
    adapter.set_message_handler(my_handler)
    await adapter.connect()

    # Keep running...
    try:
        await asyncio.Event().wait()
    finally:
        await adapter.disconnect()

asyncio.run(main())