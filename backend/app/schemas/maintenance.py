import uuid
from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


MAINTENANCE_TYPES = [
    "Oil Change",
    "Tire Replacement",
    "Engine Service",
    "Brake Service",
    "General Inspection",
]


class MaintenanceCreate(BaseModel):
    vehicle_id: uuid.UUID
    maintenance_type: str
    service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    cost: Optional[float] = None
    remarks: Optional[str] = None
    status: str = "Scheduled"


class MaintenanceUpdate(BaseModel):
    maintenance_type: Optional[str] = None
    service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    cost: Optional[float] = None
    remarks: Optional[str] = None
    status: Optional[str] = None


class MaintenanceOut(BaseModel):
    maintenance_id: uuid.UUID
    vehicle_id: uuid.UUID
    maintenance_type: str
    service_date: Optional[date] = None
    next_service_date: Optional[date] = None
    cost: Optional[float] = None
    remarks: Optional[str] = None
    status: str
    last_alert_sent: Optional[datetime] = None
    notification_stage: Optional[str] = None
    last_due_alert: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
