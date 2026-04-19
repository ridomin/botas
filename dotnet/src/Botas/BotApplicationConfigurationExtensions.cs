using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Abstractions;
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.TokenCacheProviders.InMemory;

namespace Botas;

public static class BotApplicationConfigurationExtensions
{
    internal const string ConversationHttpClientName = "BotFrameworkConversation";

    public static IServiceCollection AddBotApplication<TApp>(this IServiceCollection services) where TApp : BotApplication, new()
    {
        services.AddBotAuthorization();
        services.AddBotApplicationClients();
        services.AddSingleton<TApp>();
        return services;
    }

    public static IServiceCollection AddBotApplication<TApp>(this IServiceCollection services, TApp app) where TApp : BotApplication, new()
    {
        services.AddBotApplicationClients();
        services.AddSingleton(app);
        return services;
    }

    public static IServiceCollection AddBotApplicationClients(this IServiceCollection services, string aadConfigSectionName = "AzureAd")
    {
        services
            .AddHttpClient()
            .AddTokenAcquisition(false)
            .AddInMemoryTokenCaches()
            .AddAgentIdentities();

        services.Configure<MicrosoftIdentityApplicationOptions>(aadConfigSectionName, (options) =>
        {
            IConfiguration configuration = services.BuildServiceProvider().GetRequiredService<IConfiguration>();
            configuration.GetSection(aadConfigSectionName).Bind(options);
            
            // Ensure authority is configured for client credentials flow
            string? instance = options.Instance;
            string? tenantId = options.TenantId;
            if (!string.IsNullOrEmpty(instance) && !string.IsNullOrEmpty(tenantId))
            {
                if (!options.Authority?.Contains(instance) ?? true)
                {
                    options.Authority = $"{instance}/{tenantId}/v2.0";
                }
            }
        });

        services.AddSingleton<AgentScopeProvider>(sp =>
        {
            IConfiguration configuration = sp.GetRequiredService<IConfiguration>();
            string agentScope = configuration[$"{aadConfigSectionName}:AgentScope"] ?? "https://api.botframework.com/.default";
            return new AgentScopeProvider(agentScope);
        });

        services.AddHttpClient(ConversationHttpClientName)
            .ConfigureHttpClient(c => c.Timeout = TimeSpan.FromSeconds(30));

        static ConversationClient ConversationClientFactory(IServiceProvider provider, object serviceKey) => new(
            provider.GetRequiredService<IHttpClientFactory>().CreateClient(ConversationHttpClientName),
            provider.GetService<ILogger<ConversationClient>>()!
            );

        services.AddKeyedScoped<ConversationClient>(aadConfigSectionName, ConversationClientFactory);

        return services;
    }
}
