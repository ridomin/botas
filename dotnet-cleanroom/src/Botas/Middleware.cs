using System.Diagnostics;
using System.Text.RegularExpressions;

namespace Botas;

public class LoggingMiddleware : ITurnMiddleWare
{
    public async Task OnTurnAsync(TurnContext context, NextDelegate next, CancellationToken ct = default)
    {
        Console.WriteLine($"▶ {context.Activity.Type}");
        var sw = Stopwatch.StartNew();
        await next(ct);
        Console.WriteLine($"◀ {context.Activity.Type} ({sw.ElapsedMilliseconds}ms)");
    }
}

public class RemoveMentionMiddleware : ITurnMiddleWare
{
    private static readonly Regex MentionPattern = new(@"<at>\s*</at>", RegexOptions.Compiled);
    
    public async Task OnTurnAsync(TurnContext context, NextDelegate next, CancellationToken ct = default)
    {
        if (context.Activity.Type == "message" && !string.IsNullOrEmpty(context.Activity.Text))
        {
            context.Activity.Text = MentionPattern.Replace(context.Activity.Text, "");
        }
        await next(ct);
    }
}