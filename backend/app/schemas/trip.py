import uuid
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class TripBase(BaseModel):
    start_location: str
    destination: str
    cargo: str
    status: str = "Scheduled"
    distance: float = 0.0
    eta_seconds: int = 0
    current_lat: Optional[float] = None
    current_lng: Optional[float] = None
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    shipment_id: Optional[uuid.UUID] = None
    route_type: str = "Fastest"

class TripCreate(BaseModel):
    start_location: str
    destination: str
    cargo: str
    vehicle_id: Optional[uuid.UUID] = None
    driver_id: Optional[uuid.UUID] = None
    shipment_id: Optional[uuid.UUID] = None
    route_type: str = "Fastest"

class TripUpdateStatus(BaseModel):
    status: str

class TripOut(TripBase):
    trip_id: uuid.UUID
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    driver_rating: Optional[float] = None
    driver_review: Optional[str] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TripReviewCreate(BaseModel):
    rating: float # 1.0 to 5.0
    review: Optional[str] = None

class RouteOptimizationOut(BaseModel):
    """The recalculated trip together with the road geometry used by the map."""
    trip: TripOut
    route_coords: list[list[float]]
    distance: float
    eta_seconds: int
    route_type: str
