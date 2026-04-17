import jwt
import httpx
from typing import Optional, List, Dict
from jwt.algorithms import RSAAlgorithm

TRUSTED_PREFIXES = [
    "https://login.botframework.com/",
    "https://login.microsoftonline.com/"
]

_jwks_cache: Dict[str, Dict] = {}

async def _get_jwks(iss: str, tid: Optional[str]) -> Dict:
    if iss == "https://api.botframework.com":
        openid_url = "https://login.botframework.com/v1/.well-known/openid-configuration"
    else:
        if not tid:
            raise Exception("tid claim missing in token")
        openid_url = f"https://login.microsoftonline.com/{tid}/v2.0/.well-known/openid-configuration"

    if not any(openid_url.startswith(p) for p in TRUSTED_PREFIXES):
        raise Exception(f"Untrusted OpenID configuration URL: {openid_url}")

    if openid_url in _jwks_cache:
        return _jwks_cache[openid_url]

    async with httpx.AsyncClient() as client:
        res = await client.get(openid_url)
        config = res.json()
        jwks_uri = config["jwks_uri"]
        
        res = await client.get(jwks_uri)
        jwks = res.json()
        _jwks_cache[openid_url] = jwks
        return jwks

async def validate_bot_token(token: str, client_id: Optional[str] = None) -> None:
    if not client_id:
        return

    unverified_header = jwt.get_unverified_header(token)
    unverified_payload = jwt.decode(token, options={"verify_signature": False})
    
    iss = unverified_payload.get("iss")
    tid = unverified_payload.get("tid")
    kid = unverified_header.get("kid")

    jwks = await _get_jwks(iss, tid)
    
    public_key = None
    for key in jwks["keys"]:
        if key["kid"] == kid:
            public_key = RSAAlgorithm.from_jwk(key)
            break
            
    if not public_key:
        raise Exception("Signing key not found in JWKS")

    expected_aud = [client_id, f"api://{client_id}", "https://api.botframework.com"]
    expected_iss = [
        "https://api.botframework.com",
        f"https://sts.windows.net/{tid}/",
        f"https://login.microsoftonline.com/{tid}/v2",
        f"https://login.microsoftonline.com/{tid}/v2.0"
    ]

    jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=expected_aud,
        issuer=expected_iss
    )
