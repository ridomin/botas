using System.Text.Json.Serialization;

namespace Botas;

public class ChannelAccount
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; set; }

    [JsonPropertyName("aadObjectId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? AadObjectId { get; set; }

    [JsonPropertyName("role")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Role { get; set; }

    [JsonExtensionData]
    public Dictionary<string, object>? Properties { get; set; }
}

public class Conversation
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonExtensionData]
    public Dictionary<string, object>? Properties { get; set; }
}

public class CoreActivity
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "message";

    [JsonPropertyName("id")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Id { get; set; }

    [JsonPropertyName("serviceUrl")]
    public string ServiceUrl { get; set; } = string.Empty;

    [JsonPropertyName("channelId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ChannelId { get; set; }

    [JsonPropertyName("text")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Text { get; set; }

    [JsonPropertyName("name")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? Name { get; set; }

    [JsonPropertyName("value")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public object? Value { get; set; }

    [JsonPropertyName("from")]
    public ChannelAccount From { get; set; } = new();

    [JsonPropertyName("recipient")]
    public ChannelAccount Recipient { get; set; } = new();

    [JsonPropertyName("conversation")]
    public Conversation Conversation { get; set; } = new();

    [JsonPropertyName("entities")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<object>? Entities { get; set; }

    [JsonPropertyName("attachments")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<object>? Attachments { get; set; }

    [JsonIgnore]
    public bool IsTargeted { get; set; }

    [JsonExtensionData]
    public Dictionary<string, object>? Properties { get; set; }
}

public class ResourceResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;
}

public class InvokeResponse
{
    public int Status { get; set; }
    public object? Body { get; set; }
}
