package botas

import (
	"context"
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync"

	"github.com/golang-jwt/jwt/v5"
)

var (
	trustedPrefixes = []string{
		"https://login.botframework.com/",
		"https://login.microsoftonline.com/",
	}
	jwksCache = make(map[string]*jwks)
	jwksMu    sync.RWMutex
)

type jwks struct {
	Keys []jwk `json:"keys"`
}

type jwk struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	N   string `json:"n"`
	E   string `json:"e"`
}

func BotAuth(clientID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cid := clientID
			if cid == "" {
				cid = os.Getenv("CLIENT_ID")
			}
			if cid == "" {
				next.ServeHTTP(w, r)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if !strings.HasPrefix(authHeader, "Bearer ") {
				http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
				return
			}

			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			if err := validateBotToken(r.Context(), tokenStr, cid); err != nil {
				http.Error(w, "Authentication failed: "+err.Error(), http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func validateBotToken(ctx context.Context, tokenStr, clientID string) error {
	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		iss, _ := token.Claims.GetIssuer()
		tidValue, _ := token.Claims.(jwt.MapClaims)["tid"]
		tid, _ := tidValue.(string)

		jwksObj, err := getJWKS(ctx, iss, tid)
		if err != nil {
			return nil, err
		}

		kid, ok := token.Header["kid"].(string)
		if !ok {
			return nil, fmt.Errorf("kid header missing")
		}

		for _, key := range jwksObj.Keys {
			if key.Kid == kid {
				return decodePublicKey(key)
			}
		}
		return nil, fmt.Errorf("kid %s not found", kid)
	})

	if err != nil {
		return err
	}

	aud, _ := token.Claims.GetAudience()
	validAud := false
	expectedAuds := []string{clientID, "api://" + clientID, "https://api.botframework.com"}
	for _, a := range aud {
		for _, e := range expectedAuds {
			if a == e {
				validAud = true
				break
			}
		}
	}
	if !validAud {
		return fmt.Errorf("invalid audience")
	}

	return nil
}

func getJWKS(ctx context.Context, iss, tid string) (*jwks, error) {
	var openIDURL string
	if iss == "https://api.botframework.com" {
		openIDURL = "https://login.botframework.com/v1/.well-known/openid-configuration"
	} else {
		if tid == "" {
			return nil, fmt.Errorf("tid missing")
		}
		openIDURL = fmt.Sprintf("https://login.microsoftonline.com/%s/v2.0/.well-known/openid-configuration", tid)
	}

	trusted := false
	for _, p := range trustedPrefixes {
		if strings.HasPrefix(openIDURL, p) {
			trusted = true
			break
		}
	}
	if !trusted {
		return nil, fmt.Errorf("untrusted openid url: %s", openIDURL)
	}

	jwksMu.RLock()
	cached, ok := jwksCache[openIDURL]
	jwksMu.RUnlock()
	if ok {
		return cached, nil
	}

	resp, err := http.Get(openIDURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var config struct {
		JWKSURI string `json:"jwks_uri"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&config); err != nil {
		return nil, err
	}

	resp, err = http.Get(config.JWKSURI)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var res jwks
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, err
	}

	jwksMu.Lock()
	jwksCache[openIDURL] = &res
	jwksMu.Unlock()

	return &res, nil
}

func decodePublicKey(key jwk) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(key.N)
	if err != nil {
		return nil, err
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(key.E)
	if err != nil {
		return nil, err
	}

	var e int
	for _, b := range eBytes {
		e = e<<8 | int(b)
	}

	return &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: e,
	}, nil
}
