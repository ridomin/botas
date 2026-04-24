"""Hermes platform adapter for Microsoft Teams via botas."""

from hermes_botas._version import __version__
from hermes_botas.hermes_types import (
    BasePlatformAdapter,
    MessageEvent,
    MessageType,
    Platform,
    PlatformConfig,
    SendResult,
    SessionSource,
)
from hermes_botas.teams_adapter import MAX_MESSAGE_LENGTH, TeamsAdapter, check_teams_requirements

__all__ = [
    "__version__",
    "BasePlatformAdapter",
    "check_teams_requirements",
    "MAX_MESSAGE_LENGTH",
    "MessageEvent",
    "MessageType",
    "Platform",
    "PlatformConfig",
    "SendResult",
    "SessionSource",
    "TeamsAdapter",
]
