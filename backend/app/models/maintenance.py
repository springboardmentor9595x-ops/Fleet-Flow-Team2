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
    maintenance_type = Column(String(100), nullable=False, default="General Inspection")
    service_date = Column(Date, nullable=True, default=datetime.utcnow)
    next_service_date = Column(Date, nullable=True)
    cost = Column(Float, nullable=False, default=0.0)
    remarks = Column(Text, nullable=True)
    status = Column(String(20), default="Scheduled", nullable=False)
    last_alert_sent = Column(DateTime, nullable=True)
    notification_stage = Column(String(50), nullable=True)  # 'SCHEDULED', '7_DAYS', '1_DAY', 'DUE_HOURLY'
    last_due_alert = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationship
    vehicle = relationship("Vehicle", backref="maintenance_records")