using System.Text.Json.Serialization;

namespace Botas;

public class CoreActivity
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "message";

    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("serviceUrl")]
    public string ServiceUrl { get; set; } = "";

    [JsonPropertyName("channelId")]
    public string? ChannelId { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("value")]
    public object? Value { get; set; }

    [JsonPropertyName("from")]
    public ChannelAccount From { get; set; } = new();

    [JsonPropertyName("recipient")]
    public ChannelAccount Recipient { get; set; } = new();

    [JsonPropertyName("conversation")]
    public Conversation Conversation { get; set; } = new();

    [JsonPropertyName("entities")]
    public List<Entity>? Entities { get; set; }

    [JsonPropertyName("attachments")]
    public List<Attachment>? Attachments { get; set; }

    [JsonExtensionData]
    public Dictionary<string, object?>? Properties { get; set; }
}

public class ChannelAccount
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonPropertyName("aadObjectId")]
    public string? AadObjectId { get; set; }

    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonExtensionData]
    public Dictionary<string, object?>? Properties { get; set; }
}

public class Conversation
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";

    [JsonExtensionData]
    public Dictionary<string, object?>? Properties { get; set; }
}

public class Entity
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "";

    [JsonPropertyName("properties")]
    public Dictionary<string, object?>? Properties { get; set; }
}

public class Attachment
{
    [JsonPropertyName("contentType")]
    public string? ContentType { get; set; }

    [JsonPropertyName("content")]
    public object? Content { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }
}

public class ResourceResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = "";
}

public class InvokeResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "ok";

    [JsonPropertyName("body")]
    public object? Body { get; set; }
}