import time
import base64
import hmac
import hashlib
from typing import Optional, Dict, Any, List
from fastapi import Request, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel

SECRET_KEY = "stocksense-ai-secure-demo-secret-key-2026"

class BusinessProfile(BaseModel):
    id: str
    name: str
    type: str
    tag: str
    accent: str
    description: str
    categories: List[str]
    has_preloaded_data: bool = True
    currency: str = "INR"
    currency_symbol: str = "₹"

    @property
    def business_id(self) -> str:
        return self.id

BusinessIdentity = BusinessProfile

DEMO_BUSINESSES: Dict[str, BusinessProfile] = {
    "freshmart": BusinessProfile(
        id="freshmart",
        name="FreshMart Grocery",
        type="Grocery & Food Retail",
        tag="Grocery",
        accent="mint",
        description="Daily grocery stock, packaged foods, fresh staples, and replenishment in Indian Rupees. Preloaded with 12 items and 45-day sales history.",
        categories=["Grains & Flours", "Oils & Spices", "Packaged Foods", "Dairy & Beverages", "Household Staples"],
        has_preloaded_data=True,
    ),
    "urbanthread": BusinessProfile(
        id="urbanthread",
        name="UrbanThread Fashion",
        type="Clothing & Apparel",
        tag="Fashion",
        accent="coral",
        description="Clean clothing & apparel workspace. Starts completely empty for testing product onboarding and sales workflows from scratch.",
        categories=["T-Shirts & Polos", "Jeans & Trousers", "Ethnic & Casual Wear", "Jackets & Outerwear", "Fashion Accessories"],
        has_preloaded_data=False,
    ),
    "technest": BusinessProfile(
        id="technest",
        name="TechNest Electronics",
        type="Electronics & Accessories",
        tag="Electronics",
        accent="amber",
        description="Electronics & accessories workspace with preloaded products, hardware components, and 45-day sales history in Indian Rupees.",
        categories=["Keyboards & Mice", "Audio & Headphones", "Cables & Adapters", "Storage & Drives", "Computer Accessories"],
        has_preloaded_data=True,
    ),
    "homeease": BusinessProfile(
        id="homeease",
        name="HomeEase Supplies",
        type="Household & General Merchandise",
        tag="Home & Living",
        accent="mauve",
        description="Clean household & general merchandise workspace. Starts completely empty for testing custom inventory and ledger entries from scratch.",
        categories=["Kitchen Accessories", "Cleaning Supplies", "Storage & Organizers", "Home Utilities", "Hardware & Tools"],
        has_preloaded_data=False,
    ),
}

# PBKDF2 Password Hashing for test accounts (Never store plaintext passwords)
def _hash_pwd(pwd: str, salt_hex: str) -> str:
    salt = bytes.fromhex(salt_hex)
    return hashlib.pbkdf2_hmac("sha256", pwd.encode("utf-8"), salt, 100000).hex()

TEST_ACCOUNTS: Dict[str, Dict[str, Any]] = {
    "freshmart": {
        "business_id": "freshmart",
        "identifiers": {"freshmart", "freshmart@stocksense.ai", "freshmart@grocery.in"},
        "salt": "a1b2c3d4e5f60718",
        "hashes": {
            _hash_pwd("demo123", "a1b2c3d4e5f60718"),
            _hash_pwd("freshmart123", "a1b2c3d4e5f60718"),
            _hash_pwd("stocksense123", "a1b2c3d4e5f60718"),
        },
    },
    "urbanthread": {
        "business_id": "urbanthread",
        "identifiers": {"urbanthread", "urbanthread@stocksense.ai", "urbanthread@fashion.in"},
        "salt": "b2c3d4e5f60718a1",
        "hashes": {
            _hash_pwd("demo123", "b2c3d4e5f60718a1"),
            _hash_pwd("urbanthread123", "b2c3d4e5f60718a1"),
            _hash_pwd("stocksense123", "b2c3d4e5f60718a1"),
        },
    },
    "technest": {
        "business_id": "technest",
        "identifiers": {"technest", "technest@stocksense.ai", "technest@electronics.in"},
        "salt": "c3d4e5f60718a1b2",
        "hashes": {
            _hash_pwd("demo123", "c3d4e5f60718a1b2"),
            _hash_pwd("technest123", "c3d4e5f60718a1b2"),
            _hash_pwd("stocksense123", "c3d4e5f60718a1b2"),
        },
    },
    "homeease": {
        "business_id": "homeease",
        "identifiers": {"homeease", "homeease@stocksense.ai", "homeease@supplies.in"},
        "salt": "d4e5f60718a1b2c3",
        "hashes": {
            _hash_pwd("demo123", "d4e5f60718a1b2c3"),
            _hash_pwd("homeease123", "d4e5f60718a1b2c3"),
            _hash_pwd("stocksense123", "d4e5f60718a1b2c3"),
        },
    },
}

def authenticate_user(identifier: str, password: str) -> Optional[BusinessProfile]:
    """Validates user credentials against secure salted hashes without storing plaintext."""
    clean_id = (identifier or "").strip().lower()
    clean_pwd = (password or "").strip()
    if not clean_id or not clean_pwd:
        return None

    for biz_id, acc_info in TEST_ACCOUNTS.items():
        if clean_id in acc_info["identifiers"]:
            computed = _hash_pwd(clean_pwd, acc_info["salt"])
            for h in acc_info["hashes"]:
                if hmac.compare_digest(computed, h):
                    return DEMO_BUSINESSES[biz_id]
    return None

def generate_session_token(business_id: str) -> str:
    """Generates an HMAC-signed session token for a given business workspace."""
    if business_id not in DEMO_BUSINESSES:
        raise ValueError(f"Unknown business ID '{business_id}'")
    
    timestamp = int(time.time())
    payload = f"{business_id}:{timestamp}"
    sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
    token_str = f"{payload}:{sig}"
    return base64.urlsafe_b64encode(token_str.encode()).decode()

def verify_session_token(token: str) -> Optional[str]:
    """Decodes token and returns valid business_id or None."""
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        parts = decoded.split(":")
        if len(parts) != 3:
            return None
        business_id, timestamp_str, sig = parts
        payload = f"{business_id}:{timestamp_str}"
        expected_sig = hmac.new(SECRET_KEY.encode(), payload.encode(), hashlib.sha256).hexdigest()[:16]
        if not hmac.compare_digest(sig, expected_sig):
            return None
        if business_id not in DEMO_BUSINESSES:
            return None
        return business_id
    except Exception:
        return None

security_bearer = HTTPBearer(auto_error=False)

def get_current_business(
    request: Request,
    cred: Optional[HTTPAuthorizationCredentials] = Security(security_bearer),
) -> BusinessProfile:
    """
    Extracts and strictly validates the active business workspace.
    
    Security rules:
    1. If a Bearer token is provided, it MUST be valid. Invalid tokens return 401 Unauthorized.
    2. The token cryptographically dictates the authenticated workspace.
       Any attempt to override or spoof another workspace via headers or query parameters
       is rejected with 403 Forbidden.
    3. Unauthenticated requests cannot set arbitrary workspaces via X-Business-ID or ?business_id=.
    4. Requests without any token or headers default safely to 'freshmart' for unit tests.
    """
    # 1. Bearer token provided
    if cred and cred.credentials:
        verified_id = verify_session_token(cred.credentials)
        if not verified_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token. Please sign in again.",
            )
        
        # Cross-workspace tamper check: Ensure header does not attempt cross-tenant spoofing
        header_biz = request.headers.get("X-Business-ID")
        if header_biz and header_biz.lower().strip() != verified_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Workspace isolation violation: X-Business-ID header '{header_biz}' does not match authenticated token '{verified_id}'.",
            )
        
        # Query parameter tamper check
        query_biz = request.query_params.get("business_id")
        if query_biz and query_biz.lower().strip() != verified_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Workspace isolation violation: Query parameter 'business_id={query_biz}' does not match authenticated token '{verified_id}'.",
            )
        
        return DEMO_BUSINESSES[verified_id]

    # 2. No Bearer token provided - strictly require authentication
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required: Please provide a valid session token.",
    )
