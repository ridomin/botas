using Botas;

var app = BotApp.Create(args);

app.On("message", async (ctx, ct) =>
{
    Console.WriteLine($"Received: {ctx.Activity.Text}");
    await ctx.SendAsync($"You said: {ctx.Activity.Text}", ct);
});

app.Run();
