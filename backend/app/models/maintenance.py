import uuid
from sqlalchemy import Column, ForeignKey, String, Text, Float, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class VehicleMaintenance(Base):
    __tablename__ = "vehicle_maintenance"
    
    maintenance_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    vehicle_id = Column(UUID(as_uuid=True), ForeignKey("vehicles.vehicle_id"), nullable=False)
    description = Column(Text, nullable=False)
    cost = Column(Float, nullable=False, default=0.0)
    start_date = Column(Date, nullable=False, default=datetime.utcnow)
    end_date = Column(Date, nullable=True)
    status = Column(String(20), default="Pending", nullable=False) # Pending/Completed
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    vehicle = relationship("Vehicle", backref="maintenance_records")