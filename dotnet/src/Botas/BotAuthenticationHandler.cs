using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Identity.Client;
using System.Net.Http.Headers;

namespace Botas;

internal class BotAuthenticationHandler(
    IConfiguration configuration,
    ILogger<BotAuthenticationHandler> logger,
    string scope) : DelegatingHandler
{
    private readonly IConfiguration _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
    private readonly ILogger<BotAuthenticationHandler> _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    private readonly string _scope = scope ?? throw new ArgumentNullException(nameof(scope));
    
    private IConfidentialClientApplication? _app;
    private string? _accessToken;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        string token = await GetAccessTokenAsync(cancellationToken).ConfigureAwait(false);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, cancellationToken).ConfigureAwait(false);
    }

    private async Task<string> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        // Return cached token if still valid
        if (!string.IsNullOrEmpty(_accessToken))
        {
            return _accessToken;
        }

        string clientId = _configuration["AzureAd:ClientId"] ?? throw new InvalidOperationException("AzureAd:ClientId not configured");
        string? clientSecret = _configuration["AzureAd:ClientSecret"] ?? _configuration["AzureAd:ClientCredentials:0:ClientSecret"] ?? throw new InvalidOperationException("AzureAd:ClientSecret not configured");
        string tenantId = _configuration["AzureAd:TenantId"] ?? throw new InvalidOperationException("AzureAd:TenantId not configured");

        _app ??= ConfidentialClientApplicationBuilder
            .Create(clientId)
            .WithClientSecret(clientSecret)
            .WithAuthority($"https://login.microsoftonline.com/{tenantId}/v2.0")
            .Build();

        _logger.LogDebug("Acquiring app-only token for scope: {Scope}", _scope);
        
        AuthenticationResult result = await _app
            .AcquireTokenForClient(new[] { _scope })
            .ExecuteAsync(cancellationToken)
            .ConfigureAwait(false);

        _accessToken = result.AccessToken;
        return _accessToken;
    }
}