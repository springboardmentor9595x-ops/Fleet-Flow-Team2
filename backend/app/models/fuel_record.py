import uuid
from sqlalchemy import Column, ForeignKey, Float, Date, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database import Base

class FuelRecord(Base):
    __tablename__ = "fuel_records"
    
    fuel_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.vehicle_id"), nullable=False)
    fuel_amount = Column(Float, nullable=True)
    fuel_cost = Column(Float, nullable=True)
    fuel_type = Column(String(50), nullable=True, default="Diesel")
    mileage = Column(Float, nullable=True)
    refill_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)