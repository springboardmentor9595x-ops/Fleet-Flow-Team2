import uuid
from sqlalchemy import Column, ForeignKey, String, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Shipment(Base):
    __tablename__ = "shipments"
    
    shipment_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tracking_number = Column(String(100), unique=True, nullable=False, index=True)
    source = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    customer_name = Column(String(100), nullable=False)
    shipment_weight = Column(Float, default=0.0, nullable=False)
    
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.vehicle_id"), nullable=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.driver_id"), nullable=True)
    
    cargo_description = Column(String(255), nullable=True)
    status = Column(String(50), default="Created", nullable=False) # Created, Assigned, In Transit, Delayed, Delivered, Cancelled
    expected_delivery_time = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    vehicle = relationship("Vehicle")
    driver = relationship("Driver")