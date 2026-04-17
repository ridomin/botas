using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using Microsoft.Identity.Web;

namespace Botas;

public class ConversationClient
{
    private readonly HttpClient _httpClient;
    private readonly ITokenAcquisition _tokenAcquisition;
    private readonly IOptions<MicrosoftIdentityOptions> _identityOptions;

    public ConversationClient(
        HttpClient httpClient,
        ITokenAcquisition tokenAcquisition,
        IOptions<MicrosoftIdentityOptions> identityOptions)
    {
        _httpClient = httpClient;
        _tokenAcquisition = tokenAcquisition;
        _identityOptions = identityOptions;
    }

    public async Task<ResourceResponse> SendCoreActivityAsync(CoreActivity activity, CancellationToken ct = default)
    {
        var serviceUrl = activity.ServiceUrl;
        var conversationId = activity.Conversation.Id;

        var baseUrl = serviceUrl.EndsWith("/") ? serviceUrl : $"{serviceUrl}/";
        var urlSafeConvId = conversationId.Split(';')[0];
        var url = $"{baseUrl}v3/conversations/{Uri.EscapeDataString(urlSafeConvId!)}/activities";

        if (activity.IsTargeted)
        {
            url += "?isTargetedActivity=true";
        }

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = JsonContent.Create(activity);

        if (!string.IsNullOrEmpty(_identityOptions.Value.ClientId))
        {
            var token = await _tokenAcquisition.GetAccessTokenForAppAsync("https://api.botframework.com/.default");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();

        return (await response.Content.ReadFromJsonAsync<ResourceResponse>(cancellationToken: ct))!;
    }

    public async Task AddReactionAsync(string serviceUrl, string conversationId, string activityId, string reactionType, CancellationToken ct = default)
    {
        var baseUrl = serviceUrl.EndsWith("/") ? serviceUrl : $"{serviceUrl}/";
        var urlSafeConvId = conversationId.Split(';')[0];
        var url = $"{baseUrl}v3/conversations/{Uri.EscapeDataString(urlSafeConvId!)}/activities/{Uri.EscapeDataString(activityId)}/reactions";

        var request = new HttpRequestMessage(HttpMethod.Post, url);
        request.Content = JsonContent.Create(new { type = reactionType });

        if (!string.IsNullOrEmpty(_identityOptions.Value.ClientId))
        {
            var token = await _tokenAcquisition.GetAccessTokenForAppAsync("https://api.botframework.com/.default");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        var response = await _httpClient.SendAsync(request, ct);
        response.EnsureSuccessStatusCode();
    }
}
