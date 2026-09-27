from pydantic import BaseModel
from typing import Optional

class LoginRequest(BaseModel):
    employee_id: str
    password: str

class UserInfo(BaseModel):
    employee_id: str
    name: str
    role: str
    department: str
    zone: str
    division: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserInfo
