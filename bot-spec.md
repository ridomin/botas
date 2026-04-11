# Bot Spec

**Purpose**: Enable LLM-driven implementation in different programming languages  
**Status**: Draft  


## Overview

`botas` is a lightweight library for building Microsoft Bot Framework bots with minimal overhead. This specification documents the library's design, APIs, and behaviors to enable accurate implementation to other programming languages like Python, TypeScript/Node.js, Go, Java, or Rust.

---

## Core Concepts

### 1. Bot Framework Protocol

The library implements the Microsoft Bot Framework REST API protocol:

- **Activities**: Messages and events exchanged between bot and Bot Framework Service
- **Conversations**: Container for message exchanges between users and bots
- **Channels**: Communication platforms (Teams, Web Chat, Slack, etc.)
- **Service URL**: Per-conversation endpoint for sending activities back to the channel

### 2. Activity Types

| Type | Description |
|------|-------------|
| `message` | Text message from user or bot |
| `messageReaction` | Emoji reaction added/removed from a message |
| `conversationUpdate` | Members added/removed from conversation |
| `installationUpdate` | Bot installed/uninstalled (Teams-specific) |
| `invoke` | Special request requiring synchronous response |
---

## Package Structure in dotnet

start with https://github.com/agnte/Rido.BFLite/tree/main/src/Rido.BFLite.Core

```text
botas/dotnet/src
├── Botas.Core/           # Core bot functionality
│   ├── BotApplication.cs       # Main bot class
│   ├── ConversationClient.cs   # HTTP client for sending activities
│   ├── UserTokenClient.cs      # OAuth token management
│   ├── Schema/                 # Activity models
│   │   ├── Activity.cs
│   │   ├── ChannelData.cs
│   │   ├── Conversation.cs
│   │   └── ConversationAccount.cs
│   └── Hosting/                # ASP.NET Core integration
│       ├── AppBuilderExtensions.cs
│       ├── BotApplicationConfigurationExtensions.cs
│       ├── BotAuthenticationHandler.cs
│       └── JwtExtensions.cs
```

---

## User Scenarios & Testing

### User Story 1 - Echo Bot (Priority: P1) 🎯 MVP

A developer creates a simple echo bot that responds to user messages.

**Why this priority**: This is the most basic bot functionality and validates the core library works.

**Independent Test**: Bot receives "hello" message and responds "you said hello"

**Acceptance Scenarios**:

1. **Given** a running bot application, **When** a user sends "hello", **Then** the bot responds with "you said hello"
2. **Given** a running bot application, **When** a user sends an empty message, **Then** the bot handles it gracefully (no crash)
3. **Given** a running bot application, **When** Bot Framework sends an activity, **Then** JWT authentication validates the token

---

### User Story 2 - Proactive Messaging (Priority: P2)

A developer sends a proactive message to a user outside of a direct conversation turn.

**Why this priority**: Proactive messaging is essential for notifications and bot-initiated conversations.

**Independent Test**: Bot can send a message using stored conversation reference

**Acceptance Scenarios**:

1. **Given** a stored conversation reference, **When** the bot sends a proactive message, **Then** the user receives the message
2. **Given** an invalid conversation reference, **When** the bot sends a message, **Then** an error is returned

---

### User Story 3 - Handle Message Reactions (Priority: P3)

The bot responds when a user adds or removes a reaction to a message.

**Why this priority**: Reactions enable richer interaction patterns.

**Acceptance Scenarios**:

1. **Given** a message in conversation, **When** user adds a thumbs-up reaction, **Then** `OnMessageReaction` handler is invoked with reaction details
2. **Given** a message in conversation, **When** user removes a reaction, **Then** handler receives `ReactionsRemoved` list

---

### User Story 4 - Conversation Updates (Priority: P3)

The bot is notified when members join or leave a conversation.

**Acceptance Scenarios**:

1. **Given** a group conversation, **When** a new member joins, **Then** `OnConversationUpdate` handler receives `MembersAdded`
2. **Given** a group conversation, **When** a member leaves, **Then** handler receives `MembersRemoved`

---

### User Story 5 - Teams Installation Events (Priority: P4)

The bot handles Teams-specific installation/uninstallation events.

**Acceptance Scenarios**:

1. **Given** bot is installed in Teams, **When** installation completes, **Then** `OnInstallationUpdate` handler is invoked with `Action = "add"`
2. **Given** bot is uninstalled, **When** uninstallation completes, **Then** handler receives `Action = "remove"`

---

### User Story 6 - Middleware Pipeline (Priority: P2)

A developer adds custom middleware to process activities before/after handlers.

**Acceptance Scenarios**:

1. **Given** middleware is registered, **When** activity is received, **Then** middleware executes before handler
2. **Given** multiple middleware, **When** activity is received, **Then** middleware executes in registration order
3. **Given** middleware calls `next()`, **When** processing continues, **Then** subsequent middleware and handler execute

---

## Functional Requirements

### FR-001: Activity Serialization

System MUST serialize/deserialize activities using JSON with:

- Property naming: camelCase
- Null handling: Ignore null values when writing
- Extension data: Preserve unknown properties in a dictionary

### FR-002: HTTP Endpoint

System MUST expose a POST endpoint (default: `/api/messages`) that:

- Accepts Activity JSON in request body
- Returns activity ID on success
- Requires JWT authentication

### FR-003: JWT Authentication

System MUST validate incoming requests using:

- Issuer: `api.botframework.com` or `https://sts.windows.net/{tenantId}/`
- Audience: Bot's Client ID (App ID)
- OpenID configuration from: `https://login.botframework.com/v1/.well-known/openid-configuration`

### FR-004: Outbound Authentication

System MUST authenticate outbound requests using:

- OAuth 2.0 client credentials flow
- Scope: `https://api.botframework.com/.default`
- Token endpoint: Microsoft identity platform

### FR-005: Activity Reply

System MUST provide a method to create reply activities that:

- Copies `Conversation`, `ServiceUrl`, `ChannelId` from original
- Swaps `From` and `Recipient`
- Sets `ReplyToId` to original activity ID

### FR-006: Send Activity

System MUST send activities via HTTP POST to:

- URL: `{ServiceUrl}v3/conversations/{ConversationId}/activities/`
- Content-Type: `application/json`
- Authorization: Bearer token

### FR-007: Handler Invocation

System MUST invoke appropriate handlers based on activity type:

- `message` → `OnMessage`
- `messageReaction` → `OnMessageReaction`
- `conversationUpdate` → `OnConversationUpdate`
- `installationUpdate` → `OnInstallationUpdate` (Teams only)

### FR-008: Middleware Pipeline

System MUST support middleware that:

- Executes in registration order
- Receives `BotApplication`, `Activity`, and `NextDelegate`
- Can short-circuit by not calling `next()`
- Can modify activity before/after handler

### FR-009: Teams Channel Data

For Teams channel, System MUST parse additional data:

- `TeamsChannelData.Settings.SelectedChannel.Id`
- `TeamsChannelData.Tenant.Id`
- `TeamsChannelData.Team.Id`
- `TeamsConversationAccount.UserPrincipalName`

### FR-010: Error Handling

System MUST wrap handler exceptions in `BotHandlerException` with:

- Original exception as inner exception
- Reference to the activity that caused the error

---

## Key Entities

### Activity

The core message/event model exchanged with Bot Framework.

```text
Activity
├── type: string              # "message", "messageReaction", etc.
├── id: string?               # Unique identifier
├── serviceUrl: string?       # Callback URL for this conversation
├── channelId: string?        # "msteams", "webchat", "slack", etc.
├── text: string?             # Message text content
├── replyToId: string?        # ID of message being replied to
├── from: ConversationAccount?    # Sender information
├── recipient: ConversationAccount?  # Recipient information
├── conversation: Conversation?   # Conversation context
├── channelData: ChannelData?     # Channel-specific data
├── entities: JsonArray?          # Mentions, card actions, etc.
└── [extensionData]: Dictionary   # Unknown properties preserved
```

### ConversationAccount

Represents a user or bot in a conversation.

```text
ConversationAccount
├── id: string?               # Unique identifier
├── name: string?             # Display name
├── aadObjectId: string?      # Azure AD object ID
├── role: string?             # "user" or "bot"
└── [extensionData]: Dictionary
```

### Conversation

Represents the conversation context.

```text
Conversation
├── id: string?               # Conversation identifier
└── [extensionData]: Dictionary
```

### ChannelData

Base class for channel-specific data (extended by TeamsChannelData).

```text
ChannelData
├── clientActivityId: string?
└── [extensionData]: Dictionary
```

### TeamsChannelData (extends ChannelData)

Teams-specific conversation metadata.

```text
TeamsChannelData
├── tenant: TeamsChannelDataTenant?
│   └── id: string?
├── team: Team?
│   ├── id: string?
│   └── name: string?
├── channel: TeamsChannel?
│   ├── id: string?
│   └── name: string?
├── settings: TeamsChannelDataSettings?
│   └── selectedChannel: TeamsChannel?
└── [inherited from ChannelData]
```

### TeamsConversationAccount (extends ConversationAccount)

Teams user with additional properties.

```text
TeamsConversationAccount
├── userPrincipalName: string?  # UPN (email)
├── email: string?
└── [inherited from ConversationAccount]
```

---

## API Surface

### BotApplication Class

```text
class BotApplication:
    # Properties
    UserTokenClient: UserTokenClient          # OAuth token management
    OnActivity: Func<Activity, CancellationToken, Task>?  # Low-level activity callback
        # Note: Typically set internally by TeamsBotApplication
        # Users normally interact with typed handlers (OnMessage, etc.)

    # Methods
    ProcessAsync(httpContext, cancellationToken) -> Activity
        # Parse activity from request body
        # Run middleware pipeline
        # Invoke OnActivity callback
        # Return processed activity

    SendActivityAsync(activity, cancellationToken) -> string
        # Send activity to Bot Framework
        # Return activity ID from response

    Use(middleware) -> ITurnMiddleware
        # Register middleware component
        # Return middleware for chaining
```

### TeamsBotApplication Class (extends BotApplication)

```text
class TeamsBotApplication extends BotApplication:
    # Handler Properties
    OnMessage: MessageHandler?              # Message received
    OnMessageReaction: MessageReactionHandler?  # Reaction added/removed
    OnInstallationUpdate: InstallationUpdateHandler?  # Bot installed/removed
    OnConversationUpdate: ConversationUpdateHandler?  # Members changed

    # Constructor
    constructor(config, logger, serviceKey="AzureAd"):
        # Set up OnActivity to dispatch to appropriate handlers
        # based on activity.Type
```

### Context Class

```text
class Context:
    # Properties
    BotApplication: TeamsBotApplication     # Reference to bot
    Activity: TeamsActivity                 # Current activity

    # Methods
    SendActivityAsync(text, cancellationToken) -> string
        # Create reply activity with text
        # Send via BotApplication
```

### Handler Delegate Types

```text
delegate MessageHandler(context: Context, cancellationToken) -> Task
delegate MessageReactionHandler(args: MessageReactionArgs, context: Context, cancellationToken) -> Task
delegate InstallationUpdateHandler(args: InstallationUpdateArgs, context: Context, cancellationToken) -> Task
delegate ConversationUpdateHandler(args: ConversationUpdateArgs, context: Context, cancellationToken) -> Task
```

### ITurnMiddleware Interface

```text
interface ITurnMiddleware:
    OnTurnAsync(botApplication, activity, next, cancellationToken) -> Task
```

---

## Application Setup

The bot application requires several components to be wired together. The implementation approach varies by language/platform - use whatever pattern is idiomatic (factory functions, constructors, DI containers, or simple instantiation).

### Required Components

```text
Bot Application Setup:
    1. Create BotApplication instance
    2. Configure authentication (client credentials for outbound, JWT validation for inbound)
    3. Set up HTTP endpoint for receiving activities
    4. Wire ConversationClient for sending activities
    5. Register activity handlers

Components to wire:
    - BotApplication: Main entry point
    - ConversationClient: HTTP client for Bot Framework API
    - UserTokenClient: OAuth token management (optional, for user auth flows)
    - Authentication: JWT validation + token acquisition
```

### HTTP Endpoint Setup

```text
# Bot must expose POST endpoint (default: /api/messages)
# Endpoint must:
#   - Accept JSON body (Activity)
#   - Validate JWT token from Authorization header
#   - Return activity ID on success
#   - Return 401 for invalid/missing tokens
```

### Configuration

Configuration can be provided via environment variables, config files, or constructor parameters:

```text
Required settings:
    ClientId: "bot-app-id"           # Azure AD application ID
    ClientSecret: "bot-app-secret"   # Azure AD client secret
    TenantId: "tenant-id"            # Azure AD tenant (or "common")
    
Optional settings:
    ListenUrl: "https://localhost:5001"
    EndpointPath: "/api/messages"
```

---

## Success Criteria

### SC-001: Functional Parity

Translated implementation MUST pass all acceptance scenarios defined in user stories.

### SC-002: Protocol Compliance

Translated implementation MUST correctly serialize/deserialize all activity types per Bot Framework protocol.

### SC-003: Authentication

Translated implementation MUST validate incoming JWT tokens and authenticate outbound requests.

### SC-004: Idiomatic Code

Translated implementation SHOULD follow target language idioms and conventions (e.g., Python naming, Go interfaces, TypeScript types).

### SC-005: Minimal Dependencies

Translated implementation SHOULD minimize external dependencies while maintaining functionality.

### SC-006: Example Compatibility

A translated echo bot example MUST produce identical behavior to the C# sample when deployed.

---

## Implementation Notes for Translation

### JSON Serialization

- Use language-native JSON libraries (Python `json`, Go `encoding/json`, TypeScript native JSON)
- Configure camelCase property naming
- Preserve unknown properties via extension data mechanism
- Handle nullable fields appropriately

### HTTP Client

- Use language-native HTTP libraries
- Implement retry logic for transient failures
- Handle token refresh for long-running operations

### Web Server Framework

The bot needs an HTTP server to receive incoming activities. Use idiomatic web frameworks for each language:

- **C#/.NET**: ASP.NET Core (built-in), Kestrel
- **Python**: FastAPI, Flask, aiohttp
- **TypeScript/Node.js**: Express, Koa, Fastify, or native `http` module
- **Go**: Standard `net/http`, Gin, Echo, or Chi
- **Java**: Spring Boot, Vert.x, or Javalin
- **Rust**: Actix-web, Axum, or Rocket

The web server must:
- Accept POST requests at the bot endpoint (default: `/api/messages`)
- Parse JSON request body as Activity
- Support HTTPS (required for production)
- Handle authentication middleware for JWT validation

### Async/Await Patterns

- C# uses `async/await` with `Task<T>`
- Python: Use `asyncio` with `async/await`
- Go: Use goroutines and channels, or context
- TypeScript: Use `Promise<T>` with `async/await`
- Java: Use `CompletableFuture<T>` or reactive patterns

### Component Wiring

Use whatever approach is idiomatic for the target language:

- **Simple instantiation**: Pass dependencies via constructors
- **Factory functions**: Create components with `create_bot()` style functions
- **DI containers**: Use if the platform/framework encourages it
- **Global/module-level**: Acceptable for simple applications

The key requirement is that components can access their dependencies (e.g., BotApplication needs ConversationClient to send messages).

### JWT Validation

- Use established JWT libraries in target language
- Fetch OpenID configuration from Bot Framework
- Validate issuer, audience, signature, and expiration

### Middleware Pattern

- Implement chain-of-responsibility pattern
- Support async execution
- Allow short-circuiting via `next()` call control

---

## Sample: Echo Bot (Reference Implementation)

The echo bot demonstrates the minimal implementation. Each language should adapt the setup pattern to be idiomatic.

### C# (Source Reference)

```csharp
using Rido.BFLite.Core.Hosting;
using Rido.BFLite.Teams;

var builder = WebApplication.CreateSlimBuilder(args);
builder.Services.AddBotApplication<TeamsBotApplication>();
var app = builder.Build();

var bot = app.UseBotApplication<TeamsBotApplication>();

bot.OnMessage = async (context, cancellationToken) =>
{
    await context.SendActivityAsync(
        $"You said: {context.Activity.Text}",
        cancellationToken
    );
};

app.Run();
```

### Python (Target Example)

```python
from bflite import TeamsBotApplication

# Create bot with configuration
bot = TeamsBotApplication(
    client_id="your-app-id",
    client_secret="your-app-secret"
)

# Set up message handler
@bot.on_message
async def handle_message(context):
    await context.send_activity(f"You said: {context.activity.text}")

# Run the application
if __name__ == "__main__":
    bot.run(port=3978)
```

### TypeScript (Target Example)

```typescript
import { TeamsBotApplication } from 'bflite';

// Create bot with configuration
const bot = new TeamsBotApplication({
    clientId: 'your-app-id',
    clientSecret: 'your-app-secret'
});

// Set up message handler
bot.onMessage = async (context) => {
    await context.sendActivity(`You said: ${context.activity.text}`);
};

// Run the application
bot.listen(3978);
```

### Go (Target Example)

```go
package main

import (
    "fmt"
    "github.com/example/bflite"
)

func main() {
    bot := bflite.NewTeamsBotApplication(bflite.Config{
        ClientID:     "your-app-id",
        ClientSecret: "your-app-secret",
    })

    bot.OnMessage(func(ctx *bflite.Context) error {
        return ctx.SendActivity(fmt.Sprintf("You said: %s", ctx.Activity.Text))
    })

    bot.Listen(":3978")
}
```

---

## Appendix: Bot Framework REST API Reference

### Receive Activity

```http
POST /api/messages
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "type": "message",
  "id": "activity-id",
  "serviceUrl": "https://smba.trafficmanager.net/...",
  "channelId": "msteams",
  "from": { "id": "user-id", "name": "User Name" },
  "recipient": { "id": "bot-id", "name": "Bot Name" },
  "conversation": { "id": "conversation-id" },
  "text": "Hello bot!"
}
```

### Send Activity

```http
POST {serviceUrl}v3/conversations/{conversationId}/activities/
Authorization: Bearer {oauth-token}
Content-Type: application/json

{
  "type": "message",
  "text": "Hello user!",
  "from": { "id": "bot-id", "name": "Bot Name" },
  "recipient": { "id": "user-id", "name": "User Name" },
  "conversation": { "id": "conversation-id" },
  "replyToId": "original-activity-id"
}
```

### Response

```json
{
  "id": "new-activity-id"
}
```

---

## Appendix: Authentication Endpoints

### OpenID Configuration

```text
https://login.botframework.com/v1/.well-known/openid-configuration
```

### Token Endpoint (for outbound)

```text
https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token

POST body:
  grant_type=client_credentials
  client_id={botAppId}
  client_secret={botAppSecret}
  scope=https://api.botframework.com/.default
```

---

## Appendix: Teams-Specific Activity Properties

### Installation Update

```json
{
  "type": "installationUpdate",
  "action": "add",
  "channelData": {
    "settings": {
      "selectedChannel": {
        "id": "channel-id"
      }
    },
    "tenant": {
      "id": "tenant-id"
    }
  }
}
```

### Message Reaction

```json
{
  "type": "messageReaction",
  "reactionsAdded": [
    { "type": "like" }
  ],
  "reactionsRemoved": []
}
```

### Conversation Update

```json
{
  "type": "conversationUpdate",
  "membersAdded": [
    { "id": "user-id", "name": "User Name" }
  ],
  "membersRemoved": []
}
```