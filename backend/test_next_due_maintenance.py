import os
import sys
from datetime import date, timedelta

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.vehicle import Vehicle
from app.models.maintenance import VehicleMaintenance
from app.schemas.maintenance import MaintenanceCreate
from app.crud.maintenance_crud import create_maintenance_record, get_maintenance_records

def test_next_due_date_auto_creation():
    db = SessionLocal()
    try:
        # 1. Fetch first vehicle
        vehicle = db.query(Vehicle).first()
        assert vehicle is not None, "Vehicle required for testing"

        today = date.today()
        next_due = today + timedelta(days=45)

        print(f"Creating maintenance record for vehicle: {vehicle.registration_number}")
        print(f"Service Date: {today} | Next Due Date: {next_due}")

        payload = MaintenanceCreate(
            vehicle_id=vehicle.vehicle_id,
            maintenance_type="Brake Service",
            service_date=today,
            next_service_date=next_due,
            cost=250.0,
            remarks="Full pad replacement and brake line bleeding.",
            status="Completed"
        )

        created_rec = create_maintenance_record(db=db, record=payload)
        print(f"Created Record ID: {created_rec.maintenance_id} (Status: {created_rec.status})")

        # 2. Check if the auto-scheduled next maintenance record was created
        auto_scheduled = db.query(VehicleMaintenance).filter(
            VehicleMaintenance.vehicle_id == vehicle.vehicle_id,
            VehicleMaintenance.service_date == next_due
        ).first()

        assert auto_scheduled is not None, "Auto-scheduled maintenance record was not found!"
        print(f"Auto-Created Next Maintenance ID: {auto_scheduled.maintenance_id}")
        print(f"Type: {auto_scheduled.maintenance_type}")
        print(f"Scheduled Date: {auto_scheduled.service_date}")
        print(f"Status: {auto_scheduled.status}")
        print(f"Remarks: {auto_scheduled.remarks}")

        print("TEST PASSED: Next maintenance record automatically created based on next due date!")
    finally:
        db.close()

if __name__ == "__main__":
    test_next_due_date_auto_creation()
