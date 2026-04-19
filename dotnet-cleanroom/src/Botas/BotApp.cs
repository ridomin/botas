using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Botas;

public static class BotApp
{
    public static WebApplication Create(string[] args)
    {
        var builder = WebApplication.CreateSlimBuilder(args);
        
        var clientId = Environment.GetEnvironmentVariable("CLIENT_ID");
        
        var bot = new BotApplication();
        builder.Services.AddSingleton(bot);
        
        if (!string.IsNullOrEmpty(clientId))
        {
            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.Audience = clientId;
                    options.Authority = "https://login.botframework.com/v1/.well-known/openid-configuration";
                });
        }

        var app = builder.Build();
        
        app.Use(async (context, next) =>
        {
            if (context.Request.Path.Value == "/")
            {
                await context.Response.WriteAsync($"Bot {clientId ?? "(no auth)"} is running");
                return;
            }
            
            if (context.Request.Path.Value == "/health")
            {
                await context.Response.WriteAsJsonAsync(new { status = "ok" });
                return;
            }
            
            if (context.Request.Path.Value == "/api/messages" && context.Request.Method == "POST")
            {
                var bot = context.RequestServices.GetRequiredService<BotApplication>();
                await bot.ProcessAsync(context);
                return;
            }
            
            await next();
        });

        return app;
    }

    public static void Run(this WebApplication app)
    {
        var port = int.Parse(Environment.GetEnvironmentVariable("PORT") ?? "3978");
        app.Run($"http://0.0.0.0:{port}");
    }
}

public static class BotAppExtensions
{
    public static BotApplication On(this BotApplication app, string activityType, Func<TurnContext, CancellationToken, Task> handler)
    {
        return app.On(activityType, handler);
    }

    public static BotApplication Use(this BotApplication app, ITurnMiddleWare middleware)
    {
        return app.Use(middleware);
    }
}