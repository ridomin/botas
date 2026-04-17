using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Identity.Web;

namespace Botas;

public static class BotApplicationBuilderExtensions
{
    public static IServiceCollection AddBotApplication<TApp>(this IServiceCollection services, string configurationSectionName = "AzureAd")
        where TApp : BotApplication
    {
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddMicrosoftIdentityWebApi(options =>
            {
                services.BuildServiceProvider().GetRequiredService<IConfiguration>().GetSection(configurationSectionName).Bind(options);
            }, options =>
            {
                services.BuildServiceProvider().GetRequiredService<IConfiguration>().GetSection(configurationSectionName).Bind(options);
            });

        services.AddDistributedMemoryCache();
        services.AddMicrosoftIdentityWebAppAuthentication(services.BuildServiceProvider().GetRequiredService<IConfiguration>(), configurationSectionName)
            .EnableTokenAcquisitionToCallDownstreamApi()
            .AddInMemoryTokenCaches();

        services.AddHttpClient<ConversationClient>();
        services.AddScoped<TApp>();
        
        return services;
    }

    public static TApp UseBotApplication<TApp>(this IApplicationBuilder app)
        where TApp : BotApplication
    {
        return app.ApplicationServices.GetRequiredService<TApp>();
    }
}

public class BotApp
{
    private readonly WebApplication _webApp;
    private readonly BotApplication _bot;

    private BotApp(WebApplication webApp, BotApplication bot)
    {
        _webApp = webApp;
        _bot = bot;
    }

    public static BotApp Create(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);
        
        builder.Services.AddBotApplication<BotApplication>();
        
        var app = builder.Build();
        var bot = app.UseBotApplication<BotApplication>();

        app.MapGet("/health", () => Results.Json(new { status = "ok" }));
        app.MapGet("/", (IConfiguration config) => 
        {
            var clientId = config["AzureAd:ClientId"] ?? "unknown";
            return $"Bot {clientId} is running";
        });

        app.MapPost("/api/messages", async (HttpContext context, BotApplication botApp) =>
        {
            var response = await botApp.ProcessAsync(context);
            if (response != null)
            {
                return Results.Json(response.Body, statusCode: response.Status);
            }
            return Results.Ok();
        }).RequireAuthorization();

        return new BotApp(app, bot);
    }

    public BotApp On(string activityType, Func<TurnContext, CancellationToken, Task> handler)
    {
        _bot.On(activityType, handler);
        return this;
    }

    public void Run()
    {
        _webApp.Run();
    }
}
