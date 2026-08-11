import uuid
from pydantic import BaseModel
from datetime import datetime

class ShipmentCreate(BaseModel):
    source: str
    destination: str
    customer_name: str
    shipment_weight: float
    cargo_description: str | None = None
    expected_delivery_time: datetime | None = None
    tracking_number: str | None = None
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None

class ShipmentUpdate(BaseModel):
    source: str | None = None
    destination: str | None = None
    customer_name: str | None = None
    shipment_weight: float | None = None
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None
    cargo_description: str | None = None
    status: str | None = None
    expected_delivery_time: datetime | None = None

class ShipmentOut(BaseModel):
    shipment_id: uuid.UUID
    tracking_number: str
    source: str
    destination: str
    customer_name: str
    shipment_weight: float
    vehicle_id: uuid.UUID | None = None
    driver_id: uuid.UUID | None = None
    cargo_description: str | None = None
    status: str
    expected_delivery_time: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True
