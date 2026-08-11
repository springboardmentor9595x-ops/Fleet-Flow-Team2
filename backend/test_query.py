import json
from app.database import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.vehicle import Vehicle

db = SessionLocal()
try:
    users = db.query(User).all()
    drivers = db.query(Driver).all()
    vehicles = db.query(Vehicle).all()
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f" - {u.full_name} ({u.email}) - {u.role}")
    print(f"Total Drivers: {len(drivers)}")
    for d in drivers:
        print(f" - Driver ID: {d.driver_id}, User ID: {d.user_id}, Status: {d.status}")
    print(f"Total Vehicles: {len(vehicles)}")
    for v in vehicles:
        print(f" - Registration: {v.registration_number}, Model: {v.model}, Status: {v.status}, Driver: {v.assigned_driver}")
finally:
    db.close()
