import uuid
from datetime import datetime
from sqlalchemy import Column, ForeignKey, String, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Trip(Base):
    __tablename__ = "trips"
    
    trip_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.now, nullable=False)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.vehicle_id"), nullable=True)
    driver_id = Column(UUID(as_uuid=True), ForeignKey("drivers.driver_id"), nullable=True)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipments.shipment_id"), nullable=True)
    
    start_location = Column(String(100), nullable=False)
    destination = Column(String(100), nullable=False)
    cargo = Column(String(255), nullable=False)
    status = Column(String(50), default="Scheduled", nullable=False)
    distance = Column(Float, default=0.0)
    eta_seconds = Column(Integer, default=0)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    route_type = Column(String(50), default="Fastest", nullable=False) # Fastest, Shortest, Traffic Avoidance, Fuel Efficient

    # Manager / Admin Driver Performance Review fields
    driver_rating = Column(Float, nullable=True) # 1.0 to 5.0
    driver_review = Column(String(500), nullable=True)
    reviewed_by = Column(String(100), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)

    # Relationships
    vehicle = relationship("Vehicle", backref="trips")
    driver = relationship("Driver", backref="trips")
    shipment = relationship("Shipment", backref="trips")