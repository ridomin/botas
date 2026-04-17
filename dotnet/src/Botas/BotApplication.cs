using System.Text.Json;
using Microsoft.AspNetCore.Http;

namespace Botas;

public class BotHandlerException : Exception
{
    public CoreActivity Activity { get; }
    public BotHandlerException(string message, Exception innerException, CoreActivity activity)
        : base(message, innerException)
    {
        Activity = activity;
    }
}

public class BotApplication
{
    private readonly List<ITurnMiddleWare> _middleware = new();
    private readonly Dictionary<string, Func<TurnContext, CancellationToken, Task>> _handlers = new(StringComparer.OrdinalIgnoreCase);
    private readonly Dictionary<string, Func<TurnContext, CancellationToken, Task<InvokeResponse>>> _invokeHandlers = new();

    public ConversationClient ConversationClient { get; }
    public Func<TurnContext, CancellationToken, Task>? OnActivity { get; set; }

    public BotApplication(ConversationClient conversationClient)
    {
        ConversationClient = conversationClient;
    }

    public BotApplication Use(ITurnMiddleWare middleware)
    {
        _middleware.Add(middleware);
        return this;
    }

    public BotApplication On(string activityType, Func<TurnContext, CancellationToken, Task> handler)
    {
        _handlers[activityType] = handler;
        return this;
    }

    public BotApplication OnInvoke(string name, Func<TurnContext, CancellationToken, Task<InvokeResponse>> handler)
    {
        _invokeHandlers[name] = handler;
        return this;
    }

    public async Task<InvokeResponse?> ProcessAsync(HttpContext httpContext, CancellationToken ct = default)
    {
        var activity = await JsonSerializer.DeserializeAsync<CoreActivity>(httpContext.Request.Body, cancellationToken: ct);
        if (activity == null) return null;

        if (string.IsNullOrEmpty(activity.Type) || string.IsNullOrEmpty(activity.ServiceUrl) || string.IsNullOrEmpty(activity.Conversation?.Id))
        {
            httpContext.Response.StatusCode = 400;
            return null;
        }

        var context = new TurnContext(this, activity);
        InvokeResponse? invokeResponse = null;

        async Task RunPipeline(int index, CancellationToken ct)
        {
            if (index < _middleware.Count)
            {
                await _middleware[index].OnTurnAsync(context, (c) => RunPipeline(index + 1, c), ct);
            }
            else
            {
                if (OnActivity != null)
                {
                    await OnActivity(context, ct);
                }
                else if (activity.Type.Equals("invoke", StringComparison.OrdinalIgnoreCase))
                {
                    if (_invokeHandlers.TryGetValue(activity.Name ?? string.Empty, out var handler))
                    {
                        invokeResponse = await handler(context, ct);
                    }
                }
                else if (_handlers.TryGetValue(activity.Type, out var handler))
                {
                    await handler(context, ct);
                }
            }
        }

        try
        {
            await RunPipeline(0, ct);
        }
        catch (OperationCanceledException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new BotHandlerException("Error in bot handler", ex, activity);
        }

        return invokeResponse;
    }
}
