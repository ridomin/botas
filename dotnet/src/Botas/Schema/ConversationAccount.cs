using System.Text.Json.Serialization;

namespace Botas.Schema;

public class ConversationAccount()
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonExtensionData]
    public ExtendedPropertiesDictionary Properties { get; set; } = [];
}
