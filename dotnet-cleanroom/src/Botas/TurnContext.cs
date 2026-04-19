using System.Text.Json;
using System.Net.Http.Json;

namespace Botas;

public class TurnContext
{
    private readonly BotApplication _app;
    private readonly CoreActivity _activity;

    public TurnContext(BotApplication app, CoreActivity activity)
    {
        _app = app;
        _activity = activity;
    }

    public CoreActivity Activity => _activity;
    public BotApplication App => _app;

    public async Task<ResourceResponse?> SendAsync(string text, CancellationToken ct = default)
    {
        var reply = new CoreActivity
        {
            Type = "message",
            Text = text,
            From = _activity.Recipient,
            Recipient = _activity.From,
            Conversation = _activity.Conversation
        };
        return await SendAsync(reply, ct);
    }

    public async Task<ResourceResponse?> SendAsync(CoreActivity activity, CancellationToken ct = default)
    {
        activity.ServiceUrl = _activity.ServiceUrl;
        activity.Conversation = _activity.Conversation;
        
        if (activity.From.Id == "")
            activity.From = _activity.Recipient;
        if (activity.Recipient.Id == "")
            activity.Recipient = _activity.From;

        return await _app.SendActivityAsync(activity, ct);
    }

    public async Task SendTypingAsync(CancellationToken ct = default)
    {
        var typing = new CoreActivity
        {
            Type = "typing",
            From = _activity.Recipient,
            Recipient = _activity.From,
            Conversation = _activity.Conversation,
            ServiceUrl = _activity.ServiceUrl
        };
        
        await _app.SendActivityAsync(typing, ct);
    }
}