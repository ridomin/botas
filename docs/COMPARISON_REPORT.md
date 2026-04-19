# Clean Room vs Production Implementation Comparison

## .NET Comparison

### Production (dotnet/src/Botas/)

| Component | Production | Clean Room (dotnet-cleanroom/) | Gap |
|-----------|-----------|------------------------|-----|
| **BotApplication.ProcessAsync** | Uses `IConfiguration` DI, ILogger, ConversationClient via DI | Manual `HttpContext` + self-contained | Production uses DI |
| **Invoke handlers** | Supports `OnInvoke()` for `activity.name` dispatch | ❌ Missing | Feature gap |
| **InvokeResponse** | Has `Status` (int HTTP code) + `Body` | Returns `{}` only | Production supports custom body |
| **Middleware** | Custom `TurnMiddleware` class with `RunPipeline()` | Basic inline implementation | Parity |
| **Error handling** | Catches `OperationCanceledException`, logs, wraps in `BotHandlerException` | Basic catch | Production has better error handling |
| **ConversationClient** | Injected via DI | ❌ Not included | Feature gap |
| **Body size limit** | ❌ Not documented | ❌ Not enforced | Feature gap |
| **Service URL validation** | Uses `ConfigurationManagerCache` | Inline inline validation | Parity |
| **Logging** | Uses `ILogger` with scopes | `Console.WriteLine` | Production more robust |

### Node.js Comparison

| Component | Production (node/packages/botas/) | Clean Room (node-cleanroom/) | Gap |
|-----------|--------------------------------|---------------------------|-----|
| **BotApplication.processAsync** | Full with body size limit (1MB) | Basic reading chunks | Production has body size limit |
| **Invoke handlers** | Supports `onInvoke()` | ❌ Missing | Feature gap |
| **InvokeResponse** | Full with `status` + `body` | Returns `{}` only | Production supports custom body |
| **safeJsonParse** | Strips `__proto__`, `constructor`, `prototype` | ❌ Not implemented | Security gap |
| **ConversationClient** | Full with token provider | ❌ Not included | Feature gap |
| **TokenManager** | Full OAuth2 + managed identity | Basic token fetch | Production has caching |
| **Logging** | Uses `getLogger()` with levels | No logging | Feature gap |
| **Error handling** | Handles `RequestBodyTooLargeError` separately | Basic catch | Production has specific errors |

### Python Comparison

| Component | Production (python/packages/botas/) | Clean Room (python-cleanroom/) | Gap |
|-----------|-------------------------------------|------------------------------|-----|
| **BotApplication.on()** | Supports decorator + call | Call only | Production has decorator |
| **Invoke handlers** | Supports `on_invoke()` | ❌ Missing | Feature gap |
| **InvokeResponse** | Full with `status` + `body` | Only returns `status="ok"` | Gap |
| **Service URL validation** | Uses compiled regex patterns | Basic inline | Production uses patterns |
| **ConversationClient** | Full with TokenManager | ❌ Not included | Feature gap |
| **TokenManager** | Full OAuth2 + caching | Basic token fetch | Production has caching |
| **Logging** | Uses Python logging | No logging | Feature gap |

---

## Key Gaps Summary

| Feature | .NET | Node.js | Python |
|---------|------|--------|--------|
| Invoke handlers (`OnInvoke`/`onInvoke`) | ✅ | ✅ | ✅ |
| Custom invoke response body | ✅ | ✅ | ❌ |
| Body size limit | ❌ | ✅ | ❌ |
| Prototype pollution protection | N/A | ✅ | ❌ |
| ConversationClient | ✅ | ✅ | ✅ |
| Token caching | ✅ | ✅ | ❌ |
| Decorator support (Python) | N/A | N/A | ✅ |

---

## Recommendations

### High Priority

1. **Add `OnInvoke` handlers to all languages** - Clean room missed the invoke activity dispatch by `activity.name`
2. **Add custom invoke response bodies** - Clean room returns `{}` but production supports arbitrary JSON
3. **Add body size limits** - Node.js production has 1MB limit, clean room doesn't

### Medium Priority

4. **Add prototype pollution protection to Python** - Should strip `__proto__`, `constructor`, `prototype`
5. **Add conversation client** - Clean room has core but misses ConversationClient wrapper
6. **Add proper logging** - All clean rooms use Console.WriteLine/print instead of framework logging

### Low Priority

7. **Add token caching** - Production caches tokens, clean room fetches on every request
8. **Add Python decorator support** - Production supports `@bot.on("message")` decorator