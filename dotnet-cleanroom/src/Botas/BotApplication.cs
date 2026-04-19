using System.Text.Json;
using Microsoft.AspNetCore.Http;
using System.Net.Http.Json;

namespace Botas;

public delegate Task NextDelegate(CancellationToken cancellationToken);

public interface ITurnMiddleWare
{
    Task OnTurnAsync(TurnContext context, NextDelegate next, CancellationToken cancellationToken = default);
}

public class BotApplication
{
    private readonly Dictionary<string, Func<TurnContext, CancellationToken, Task>> _handlers = new(StringComparer.OrdinalIgnoreCase);
    private readonly List<ITurnMiddleWare> _middleware = new();
    private Func<TurnContext, CancellationToken, Task>? _catchAllHandler;
    private readonly HttpClient _httpClient;
    private string? _clientId;
    private string? _clientSecret;
    private string? _tenantId;
    private string? _outboundToken;
    private DateTime _tokenExpiry = DateTime.MinValue;

    public BotApplication()
    {
        _clientId = Environment.GetEnvironmentVariable("CLIENT_ID");
        _clientSecret = Environment.GetEnvironmentVariable("CLIENT_SECRET");
        _tenantId = Environment.GetEnvironmentVariable("TENANT_ID") ?? "common";
        _httpClient = new HttpClient();
    }

    public BotApplication On(string activityType, Func<TurnContext, CancellationToken, Task> handler)
    {
        _handlers[activityType] = handler;
        return this;
    }

    public Func<TurnContext, CancellationToken, Task>? OnActivity 
    { 
        get => _catchAllHandler;
        set => _catchAllHandler = value;
    }

    public BotApplication Use(ITurnMiddleWare middleware)
    {
        _middleware.Add(middleware);
        return this;
    }

    public async Task<InvokeResponse?> ProcessAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(_clientId))
        {
            return await ProcessActivityInternalAsync(httpContext, cancellationToken);
        }

        var authHeader = httpContext.Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            httpContext.Response.StatusCode = 401;
            return null;
        }

        var token = authHeader["Bearer ".Length..];
        
        try
        {
            var validationResult = await ValidateTokenAsync(token, cancellationToken);
            if (!validationResult)
            {
                httpContext.Response.StatusCode = 401;
                return null;
            }

            return await ProcessActivityInternalAsync(httpContext, cancellationToken);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Auth error: {ex.Message}");
            httpContext.Response.StatusCode = 401;
            return null;
        }
    }

    private async Task<InvokeResponse?> ProcessActivityInternalAsync(HttpContext httpContext, CancellationToken cancellationToken)
    {
        httpContext.Request.EnableBuffering();
        using var reader = new StreamReader(httpContext.Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync(cancellationToken);
        
        var activity = JsonSerializer.Deserialize<CoreActivity>(body);
        if (activity == null)
        {
            httpContext.Response.StatusCode = 400;
            await httpContext.Response.WriteAsync("{}");
            return null;
        }

        if (!ValidateRequiredFields(activity))
        {
            httpContext.Response.StatusCode = 400;
            await httpContext.Response.WriteAsync("{}");
            return null;
        }

        if (!ValidateServiceUrl(activity.ServiceUrl))
        {
            httpContext.Response.StatusCode = 400;
            await httpContext.Response.WriteAsync("{}");
            return null;
        }

        var turnContext = new TurnContext(this, activity);
        var nextDelegate = new NextDelegate(async ct => await DispatchAsync(turnContext, ct));

        await ExecuteMiddlewarePipelineAsync(turnContext, nextDelegate, cancellationToken);

        httpContext.Response.ContentType = "application/json";
        await httpContext.Response.WriteAsync("{}");
        
        return null;
    }

    private async Task ExecuteMiddlewarePipelineAsync(TurnContext context, NextDelegate finalHandler, CancellationToken ct)
    {
        NextDelegate next = finalHandler;
        
        for (int i = _middleware.Count - 1; i >= 0; i--)
        {
            var middleware = _middleware[i];
            var currentNext = next;
            next = async ct =>
            {
                await middleware.OnTurnAsync(context, currentNext, ct);
            };
        }

        await next(ct);
    }

    private async Task DispatchAsync(TurnContext context, CancellationToken ct)
    {
        var handler = _catchAllHandler;
        
        if (handler == null)
        {
            var activityType = context.Activity.Type;
            _handlers.TryGetValue(activityType, out handler);
        }

        if (handler != null)
        {
            try
            {
                await handler(context, ct);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new BotHandlerException(ex, context.Activity);
            }
        }
    }

    public async Task<ResourceResponse?> SendActivityAsync(CoreActivity activity, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(activity.ServiceUrl) || string.IsNullOrEmpty(activity.Conversation?.Id))
        {
            return null;
        }

        var serviceUrl = NormalizeServiceUrl(activity.ServiceUrl);
        var conversationId = TruncateConversationId(activity.Conversation.Id);
        var url = $"{serviceUrl}v3/conversations/{conversationId}/activities";

        var token = await GetOutboundTokenAsync(ct);
        
        using var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        request.Content = JsonContent.Create(activity);

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<ResourceResponse>(cancellationToken: ct);
        return result ?? new ResourceResponse();
    }

    private async Task<string> GetOutboundTokenAsync(CancellationToken ct)
    {
        if (!string.IsNullOrEmpty(_outboundToken) && DateTime.UtcNow < _tokenExpiry.AddMinutes(-5))
        {
            return _outboundToken;
        }

        var tokenUrl = $"https://login.microsoftonline.com/{_tenantId}/oauth2/v2.0/token";
        
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "client_credentials",
            ["client_id"] = _clientId ?? "",
            ["client_secret"] = _clientSecret ?? "",
            ["scope"] = "https://api.botframework.com/.default"
        });

        using var request = new HttpRequestMessage(HttpMethod.Post, tokenUrl);
        request.Content = content;

        var response = await _httpClient.SendAsync(request, ct);
        var result = await response.Content.ReadFromJsonAsync<Dictionary<string, JsonElement>>(cancellationToken: ct);
        
        _outboundToken = result?["access_token"].GetString() ?? "";
        var expiresIn = result?["expires_in"].GetInt32() ?? 3600;
        _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn);

        return _outboundToken;
    }

    private async Task<bool> ValidateTokenAsync(string token, CancellationToken ct)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length != 3)
                return false;

            var payload = parts[1];
            var padding = 4 - (payload.Length % 4);
            if (padding != 4)
                payload += new string('=', padding);

            var json = Convert.FromBase64String(payload.Replace('-', '+').Replace('_', '/'));
            var doc = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(json);
            
            if (doc == null)
                return false;

            var aud = doc.TryGetValue("aud", out var audClaim) ? audClaim.GetString() : null;
            var iss = doc.TryGetValue("iss", out var issClaim) ? issClaim.GetString() : null;
            var tid = doc.TryGetValue("tid", out var tidClaim) ? tidClaim.GetString() : null;
            var exp = doc.TryGetValue("exp", out var expClaim) ? expClaim.GetInt64() : 0;

            if (exp < DateTimeOffset.UtcNow.ToUnixTimeSeconds())
                return false;

            var validAudiences = new[] { _clientId, $"api://{_clientId}", "https://api.botframework.com" };
            if (!validAudiences.Contains(aud))
                return false;

            var validIssuers = new[] 
            { 
                "https://api.botframework.com",
                $"https://sts.windows.net/{tid}/",
                $"https://login.microsoftonline.com/{tid}/v2",
                $"https://login.microsoftonline.com/{tid}/v2.0"
            };
            if (!validIssuers.Contains(iss))
                return false;

            return true;
        }
        catch
        {
            return false;
        }
    }

    private bool ValidateRequiredFields(CoreActivity activity)
    {
        return !string.IsNullOrEmpty(activity.Type)
            && !string.IsNullOrEmpty(activity.ServiceUrl)
            && !string.IsNullOrEmpty(activity.Conversation?.Id);
    }

    private bool ValidateServiceUrl(string serviceUrl)
    {
        if (string.IsNullOrEmpty(serviceUrl))
            return false;

        try
        {
            var uri = new Uri(serviceUrl);
            var host = uri.Host.ToLowerInvariant();
            
            if (host == "localhost" || host == "127.0.0.1")
                return uri.Scheme == "http" || uri.Scheme == "https";

            var allowedPatterns = new[]
            {
                "botframework.com",
                "botframework.us",
                "botframework.cn",
                "trafficmanager.net"
            };

            return allowedPatterns.Any(p => host.EndsWith(p)) && uri.Scheme == "https";
        }
        catch
        {
            return false;
        }
    }

    private string NormalizeServiceUrl(string serviceUrl)
    {
        serviceUrl = serviceUrl.TrimEnd('/');
        if (!serviceUrl.EndsWith('/'))
            serviceUrl += "/";
        return serviceUrl;
    }

    private string TruncateConversationId(string conversationId)
    {
        var semicolonIndex = conversationId.IndexOf(';');
        if (semicolonIndex > 0)
            conversationId = conversationId[..semicolonIndex];
        return Uri.EscapeDataString(conversationId);
    }
}

public class BotHandlerException : Exception
{
    public CoreActivity Activity { get; }
    
    public BotHandlerException(Exception inner, CoreActivity activity)
        : base("Handler error", inner)
    {
        Activity = activity;
    }
}