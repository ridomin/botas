namespace Botas;

public class TurnContext
{
    private static readonly Dictionary<string, string> EmojiMap = new()
    {
        { "👍", "like" },
        { "❤️", "heart" },
        { "😂", "laugh" },
        { "😮", "surprised" },
        { "😢", "sad" },
        { "😠", "angry" }
    };

    public BotApplication App { get; }
    public CoreActivity Activity { get; }

    public TurnContext(BotApplication app, CoreActivity activity)
    {
        App = app;
        Activity = activity;
    }

    public Task<ResourceResponse> SendAsync(string text, CancellationToken ct = default)
    {
        return SendAsync(new CoreActivity { Type = "message", Text = text }, ct);
    }

    public async Task<ResourceResponse> SendAsync(CoreActivity reply, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(reply.ServiceUrl)) reply.ServiceUrl = Activity.ServiceUrl;
        if (string.IsNullOrEmpty(reply.Conversation.Id)) reply.Conversation = new Conversation { Id = Activity.Conversation.Id };
        if (string.IsNullOrEmpty(reply.From.Id)) reply.From = new ChannelAccount { Id = Activity.Recipient.Id, Name = Activity.Recipient.Name };
        if (string.IsNullOrEmpty(reply.Recipient.Id)) reply.Recipient = new ChannelAccount { Id = Activity.From.Id, Name = Activity.From.Name };
        if (string.IsNullOrEmpty(reply.ChannelId)) reply.ChannelId = Activity.ChannelId;

        return await App.ConversationClient.SendCoreActivityAsync(reply, ct);
    }

    public Task SendTypingAsync(CancellationToken ct = default)
    {
        return SendAsync(new CoreActivity { Type = "typing" }, ct);
    }

    public Task<ResourceResponse> SendTargetedAsync(string text, ChannelAccount recipient, CancellationToken ct = default)
    {
        return SendAsync(new CoreActivity
        {
            Type = "message",
            Text = text,
            Recipient = recipient,
            IsTargeted = true
        }, ct);
    }

    public async Task AddReactionAsync(string emojiOrType, CancellationToken ct = default)
    {
        var reactionType = EmojiMap.TryGetValue(emojiOrType, out var mapped) ? mapped : emojiOrType;
        if (string.IsNullOrEmpty(Activity.Id))
        {
            throw new InvalidOperationException("Cannot add reaction: incoming activity has no id");
        }
        await App.ConversationClient.AddReactionAsync(
            Activity.ServiceUrl,
            Activity.Conversation.Id,
            Activity.Id,
            reactionType,
            ct);
    }
}
