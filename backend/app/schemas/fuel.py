import uuid
from pydantic import BaseModel
from datetime import date
from typing import Optional


class FuelCreate(BaseModel):
    vehicle_id: uuid.UUID
    fuel_amount: Optional[float] = None
    fuel_cost: Optional[float] = None
    mileage: Optional[float] = None
    refill_date: Optional[date] = None


class FuelOut(BaseModel):
    fuel_id: uuid.UUID
    vehicle_id: uuid.UUID
    fuel_amount: Optional[float] = None
    fuel_cost: Optional[float] = None
    mileage: Optional[float] = None
    refill_date: Optional[date] = None

    class Config:
        from_attributes = True
