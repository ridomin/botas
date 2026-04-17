package botas

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

type BotApplicationOptions struct {
	ClientID               string
	ClientSecret           string
	TenantID               string
	ManagedIdentityID      string
	TokenFactory           func(scope, tenantID string) (string, error)
}

type TokenManager struct {
	options BotApplicationOptions
	cache   map[string]cachedToken
	mu      sync.Mutex
}

type cachedToken struct {
	token   string
	expires time.Time
}

func NewTokenManager(opts BotApplicationOptions) *TokenManager {
	return &TokenManager{
		options: opts,
		cache:   make(map[string]cachedToken),
	}
}

func (tm *TokenManager) GetToken(ctx context.Context, scope, tenantID string) (string, error) {
	if tm.options.TokenFactory != nil {
		return tm.options.TokenFactory(scope, tenantID)
	}

	clientID := tm.options.ClientID
	if clientID == "" {
		clientID = os.Getenv("CLIENT_ID")
	}
	clientSecret := tm.options.ClientSecret
	if clientSecret == "" {
		clientSecret = os.Getenv("CLIENT_SECRET")
	}
	tenant := tm.options.TenantID
	if tenant == "" {
		tenant = os.Getenv("TENANT_ID")
	}
	if tenant == "" {
		tenant = tenantID
	}

	if clientID == "" || clientSecret == "" {
		return "", nil
	}

	tm.mu.Lock()
	defer tm.mu.Unlock()

	key := fmt.Sprintf("%s:%s:%s", clientID, tenant, scope)
	if cached, ok := tm.cache[key]; ok && cached.expires.After(time.Now().Add(time.Minute)) {
		return cached.token, nil
	}

	tokenURL := fmt.Sprintf("https://login.microsoftonline.com/%s/oauth2/v2.0/token", tenant)
	data := url.Values{}
	data.Set("grant_type", "client_credentials")
	data.Set("client_id", clientID)
	data.Set("client_secret", clientSecret)
	data.Set("scope", scope)

	req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get token: %d %s", resp.StatusCode, string(body))
	}

	var res struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return "", err
	}

	tm.cache[key] = cachedToken{
		token:   res.AccessToken,
		expires: time.Now().Add(time.Duration(res.ExpiresIn) * time.Second),
	}

	return res.AccessToken, nil
}

type ConversationClient struct {
	tokenManager *TokenManager
}

func NewConversationClient(opts BotApplicationOptions) *ConversationClient {
	return &ConversationClient{
		tokenManager: NewTokenManager(opts),
	}
}

func (cc *ConversationClient) SendCoreActivityAsync(ctx context.Context, serviceURL, conversationID string, activity CoreActivity) (*ResourceResponse, error) {
	baseURL := serviceURL
	if !strings.HasSuffix(baseURL, "/") {
		baseURL += "/"
	}
	urlSafeConvID := strings.Split(conversationID, ";")[0]
	endpoint := fmt.Sprintf("%sv3/conversations/%s/activities", baseURL, url.PathEscape(urlSafeConvID))

	if activity.IsTargeted {
		endpoint += "?isTargetedActivity=true"
	}

	token, err := cc.tokenManager.GetToken(ctx, "https://api.botframework.com/.default", "common")
	if err != nil {
		return nil, err
	}

	body, err := json.Marshal(activity)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		resBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("failed to send activity: %d %s", resp.StatusCode, string(resBody))
	}

	var res ResourceResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	return &res, nil
}
