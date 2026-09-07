import uuid
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class DriverCreate(BaseModel):
    """Register a new driver — creates a User (role=Driver) + linked Driver record."""
    full_name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = 0
    address: Optional[str] = None
    status: str = "Available"


class DriverUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    address: Optional[str] = None
    status: Optional[str] = None


class DriverOut(BaseModel):
    driver_id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: str
    phone: Optional[str] = None
    license_number: Optional[str] = None
    experience_years: Optional[int] = None
    address: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
