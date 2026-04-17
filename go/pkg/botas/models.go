package botas

import (
	"encoding/json"
)

// ChannelAccount represents a user or bot identity.
type ChannelAccount struct {
	ID          string `json:"id"`
	Name        string `json:"name,omitempty"`
	AADObjectID string `json:"aadObjectId,omitempty"`
	Role        string `json:"role,omitempty"`
	// Properties preserves extension data
	Properties map[string]json.RawMessage `json:"-"`
}

// MarshalJSON handles extension data for ChannelAccount.
func (ca ChannelAccount) MarshalJSON() ([]byte, error) {
	type Alias ChannelAccount
	b, err := json.Marshal(Alias(ca))
	if err != nil {
		return nil, err
	}
	if len(ca.Properties) == 0 {
		return b, nil
	}
	var res map[string]json.RawMessage
	if err := json.Unmarshal(b, &res); err != nil {
		return nil, err
	}
	for k, v := range ca.Properties {
		res[k] = v
	}
	return json.Marshal(res)
}

// UnmarshalJSON handles extension data for ChannelAccount.
func (ca *ChannelAccount) UnmarshalJSON(b []byte) error {
	type Alias ChannelAccount
	var aux Alias
	if err := json.Unmarshal(b, &aux); err != nil {
		return err
	}
	*ca = ChannelAccount(aux)
	var res map[string]json.RawMessage
	if err := json.Unmarshal(b, &res); err != nil {
		return err
	}
	delete(res, "id")
	delete(res, "name")
	delete(res, "aadObjectId")
	delete(res, "role")
	ca.Properties = res
	return nil
}

// Conversation represents a minimal conversation reference.
type Conversation struct {
	ID         string                     `json:"id"`
	Properties map[string]json.RawMessage `json:"-"`
}

// MarshalJSON/UnmarshalJSON for Conversation omitted for brevity but follows same pattern

// CoreActivity is the core message/event model.
type CoreActivity struct {
	Type         string                     `json:"type"`
	ID           string                     `json:"id,omitempty"`
	ServiceURL   string                     `json:"serviceUrl"`
	ChannelID    string                     `json:"channelId,omitempty"`
	Text         string                     `json:"text,omitempty"`
	Name         string                     `json:"name,omitempty"`
	Value        interface{}                `json:"value,omitempty"`
	From         ChannelAccount             `json:"from"`
	Recipient    ChannelAccount             `json:"recipient"`
	Conversation Conversation               `json:"conversation"`
	Entities     []interface{}              `json:"entities,omitempty"`
	Attachments  []interface{}              `json:"attachments,omitempty"`
	IsTargeted   bool                       `json:"-"` // Internal hint
	Properties   map[string]json.RawMessage `json:"-"`
}

// ResourceResponse is the response for an outbound activity.
type ResourceResponse struct {
	ID string `json:"id"`
}

// InvokeResponse is the response from an invoke handler.
type InvokeResponse struct {
	Status int         `json:"status"`
	Body   interface{} `json:"body,omitempty"`
}
