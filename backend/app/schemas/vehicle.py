import uuid
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class VehicleBase(BaseModel):
    registration_number: str
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: str
    manufacture_year: Optional[int] = None
    fuel_type: str = "Diesel"
    capacity: Optional[int] = None
    assigned_driver: Optional[uuid.UUID] = None
    status: str = "Available"  # Available / Assigned / Maintenance / In Transit


class VehicleCreate(VehicleBase):
    pass


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = None
    vehicle_type: Optional[str] = None
    brand: Optional[str] = None
    model: Optional[str] = None
    manufacture_year: Optional[int] = None
    fuel_type: Optional[str] = None
    capacity: Optional[int] = None
    assigned_driver: Optional[uuid.UUID] = None
    status: Optional[str] = None


class VehicleOut(VehicleBase):
    vehicle_id: uuid.UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
