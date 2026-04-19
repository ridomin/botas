# Configuration

**Purpose**: Quick reference for Botas configuration.
**Status**: Draft

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CLIENT_ID` | No* | — | Azure AD bot ID |
| `CLIENT_SECRET` | No | — | Bot client secret |
| `TENANT_ID` | No | — | Azure AD tenant |
| `MANAGED_IDENTITY_CLIENT_ID` | No | — | Managed identity for Azure hosting |
| `PORT` | No | `3978` | HTTP listen port |

\* If not set, bot runs without auth (dev/testing only).

---

## Authentication Flows

| CLIENT_ID | CLIENT_SECRET | Flow |
|-----------|--------------|------|
| not set | — | No auth |
| set | set | Client credentials |
| set | not set | Managed identity |
| set | not set | `MANAGED_IDENTITY_CLIENT_ID` set → Federated identity |

---

## Auth Helpers

| Framework | Helper |
|-----------|--------|
| ASP.NET Core | `AddBotApplication<TBot>()` |
| Express | `botAuthExpress()` |
| Hono | `botAuthHono()` |
| FastAPI | `bot_auth_dependency()` |
| aiohttp | `validate_bot_token()` |

---

## References

- [Inbound Auth](./inbound-auth.md)
- [Outbound Auth](./outbound-auth.md)
- [Setup](./Setup.md)