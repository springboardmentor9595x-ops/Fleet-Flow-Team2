import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
from app.database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    vehicle_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_number = Column(String(20), unique=True, nullable=False)
    vehicle_type = Column(String(50), nullable=True)
    brand = Column(String(50), nullable=True)
    model = Column(String(50), nullable=False)
    manufacture_year = Column(Integer, nullable=True)
    fuel_type = Column(String(20), default="Diesel", nullable=False)
    capacity = Column(Integer, default=0, nullable=True)  # in kg
    assigned_driver = Column(UUID(as_uuid=True), ForeignKey("drivers.driver_id"), nullable=True)
    status = Column(String(20), default="Available", nullable=False)  # Available/Assigned/Maintenance/In Transit
    created_at = Column(DateTime, default=datetime.utcnow)

    @property
    def license_plate(self):
        return self.registration_number

    @license_plate.setter
    def license_plate(self, value):
        self.registration_number = value