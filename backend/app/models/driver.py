import uuid
from sqlalchemy import Column, ForeignKey, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from sqlalchemy.orm import relationship
from app.database import Base

class Driver(Base):
    __tablename__ = "drivers"
    
    driver_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.user_id"), unique=True)
    license_number = Column(String(50), unique=True, nullable=True)
    experience_years = Column(Integer, nullable=True)
    address = Column(String, nullable=True)
    status = Column(String(20), default="Active", nullable=False) # Active/Inactive
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="driver_profile")