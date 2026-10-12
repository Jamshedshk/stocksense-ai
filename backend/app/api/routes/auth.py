from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body, status
from pydantic import BaseModel
from app.core.security import (
    DEMO_BUSINESSES,
    BusinessProfile,
    authenticate_user,
    generate_session_token,
    get_current_business,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Workspaces"])

class LoginRequest(BaseModel):
    identifier: str
    password: str

class DemoLoginRequest(BaseModel):
    business_id: Optional[str] = None

class DemoLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    business: BusinessProfile

AuthResponse = DemoLoginResponse

@router.post("/login", response_model=DemoLoginResponse)
def login_with_credentials(req: LoginRequest):
    """
    Conventional authentication endpoint.
    Accepts Email or Demo ID along with password, validates salted PBKDF2 hash,
    and returns a signed session token.
    """
    biz = authenticate_user(req.identifier, req.password)
    if not biz:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/Demo ID or password. Please verify your credentials.",
        )
    
    token = generate_session_token(biz.id)
    return DemoLoginResponse(
        access_token=token,
        token_type="bearer",
        business=biz,
    )

@router.get("/businesses", response_model=List[BusinessProfile])
def list_demo_businesses():
    """Returns available test business profiles for shortcut entry and testing."""
    return list(DEMO_BUSINESSES.values())

@router.post("/demo-login", response_model=DemoLoginResponse)
@router.post("/quick-login", response_model=DemoLoginResponse)
def demo_login(
    req: Optional[DemoLoginRequest] = None,
    business_id: Optional[str] = None,
):
    """
    Authenticates into one of the four configured test workspaces
    via secure server-side session token issuance.
    """
    bid = ""
    if req and req.business_id:
        bid = req.business_id.lower().strip()
    elif business_id:
        bid = business_id.lower().strip()

    if not bid or bid not in DEMO_BUSINESSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid workspace account '{bid}'. Allowed accounts: {list(DEMO_BUSINESSES.keys())}",
        )
    
    token = generate_session_token(bid)
    return DemoLoginResponse(
        access_token=token,
        token_type="bearer",
        business=DEMO_BUSINESSES[bid],
    )

@router.get("/me", response_model=BusinessProfile)
def get_current_user_business(current_biz: BusinessProfile = Depends(get_current_business)):
    """Returns the currently active business profile from the verified session."""
    return current_biz

