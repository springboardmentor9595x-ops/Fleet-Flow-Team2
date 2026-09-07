import uuid
from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.user import RoleEnum

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
    role: RoleEnum = RoleEnum.Driver

class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    role: RoleEnum | None = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    user_id: uuid.UUID
    full_name: str
    email: EmailStr
    phone: str | None = None
    role: RoleEnum
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class OTPSendRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    password: str