import os
import sys
import json
from datetime import datetime

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.models.shipment import Shipment
from app.models.trip import Trip
from app.core.security import hash_password

def seed_db():
    db = SessionLocal()
    try:
        # 0. Seed Staff Roles (Admin, FleetManager, Dispatcher)
        staff_data = [
            {"full_name": "System Admin", "email": "admin@fleetflow.com", "role": RoleEnum.Admin},
            {"full_name": "Fleet Manager User", "email": "manager@fleetflow.com", "role": RoleEnum.FleetManager},
            {"full_name": "Dispatcher User", "email": "dispatcher@fleetflow.com", "role": RoleEnum.Dispatcher},
        ]
        print("Seeding administrative staff accounts...")
        for s in staff_data:
            existing = db.query(User).filter(User.email == s["email"]).first()
            if not existing:
                user = User(
                    full_name=s["full_name"],
                    email=s["email"],
                    password=hash_password("SecurePassword123!"),
                    phone="555-0000",
                    role=s["role"]
                )
                db.add(user)
                db.commit()
                print(f"[SUCCESS] Staff account created: {s['full_name']} ({s['role'].value})")
            else:
                existing.role = s["role"]
                existing.password = hash_password("SecurePassword123!")
                db.add(existing)
                db.commit()
                print(f"[INFO] Staff account {s['full_name']} updated.")

        # 1. Seed Driver Profiles
        drivers_data = [
          {"full_name": "Sarah Jenkins", "email": "sarah.jenkins@fleetflow.com", "phone": "555-0101"},
          {"full_name": "Marcus Vance", "email": "marcus.vance@fleetflow.com", "phone": "555-0102"},
          {"full_name": "Elena Rostova", "email": "elena.rostova@fleetflow.com", "phone": "555-0103"},
          {"full_name": "Alex Mercer", "email": "alex.mercer@fleetflow.com", "phone": "555-0104"},
          {"full_name": "James O'Connor", "email": "james.oconnor@fleetflow.com", "phone": "555-0105"},
          {"full_name": "Clara Oswald", "email": "clara.oswald@fleetflow.com", "phone": "555-0106"},
        ]
        
        print("Seeding driver profiles into the FleetFlow database...")
        driver_ids = []
        for d in drivers_data:
            existing = db.query(User).filter(User.email == d["email"]).first()
            if not existing:
                user = User(
                    full_name=d["full_name"],
                    email=d["email"],
                    password=hash_password("SecurePassword123!"),
                    phone=d["phone"],
                    role=RoleEnum.Driver
                )
                db.add(user)
                db.commit()
                db.refresh(user)
                
                existing_driver = db.query(Driver).filter(Driver.user_id == user.user_id).first()
                if not existing_driver:
                    driver = Driver(user_id=user.user_id)
                    db.add(driver)
                    db.commit()
                    db.refresh(driver)
                    driver_ids.append(driver.driver_id)
                else:
                    driver_ids.append(existing_driver.driver_id)
                print(f"[SUCCESS] Driver created: {d['full_name']}")
            else:
                existing_driver = db.query(Driver).filter(Driver.user_id == existing.user_id).first()
                if not existing_driver:
                    driver = Driver(user_id=existing.user_id)
                    db.add(driver)
                    db.commit()
                    db.refresh(driver)
                    driver_ids.append(driver.driver_id)
                else:
                    driver_ids.append(existing_driver.driver_id)
                print(f"[INFO] Driver {d['full_name']} already exists.")

        # 2. Seed Fleet Vehicles
        vehicles_data = [
            {"registration_number": "MH-12-CA-9482", "brand": "Tesla", "model": "Tesla Semi", "vehicle_type": "Heavy Truck", "fuel_type": "Electric", "capacity": 4500, "manufacture_year": 2022},
            {"registration_number": "DL-01-TX-5201", "brand": "Freightliner", "model": "Cascadia 126", "vehicle_type": "Heavy Truck", "fuel_type": "Diesel", "capacity": 6000, "manufacture_year": 2020},
            {"registration_number": "KA-05-NV-8821", "brand": "Volvo", "model": "VNL 860", "vehicle_type": "Heavy Truck", "fuel_type": "Diesel", "capacity": 5500, "manufacture_year": 2019},
            {"registration_number": "GJ-18-WA-7123", "brand": "Kenworth", "model": "T680", "vehicle_type": "Heavy Truck", "fuel_type": "Diesel", "capacity": 5000, "manufacture_year": 2021},
            {"registration_number": "AP-07-TY-4321", "brand": "Peterbilt", "model": "579 Semi", "vehicle_type": "Heavy Truck", "fuel_type": "Diesel", "capacity": 5200, "manufacture_year": 2022},
        ]

        print("\nSeeding fleet vehicles into the FleetFlow database...")
        vehicle_ids = []
        for i, v in enumerate(vehicles_data):
            existing_v = db.query(Vehicle).filter(Vehicle.registration_number == v["registration_number"]).first()
            if not existing_v:
                # Assign to one of the seeded drivers round-robin style
                assigned = driver_ids[i % len(driver_ids)] if driver_ids else None
                veh = Vehicle(
                    registration_number=v["registration_number"],
                    brand=v["brand"],
                    model=v["model"],
                    vehicle_type=v["vehicle_type"],
                    fuel_type=v["fuel_type"],
                    capacity=v["capacity"],
                    manufacture_year=v["manufacture_year"],
                    status="Available" if not assigned else "Assigned",
                    assigned_driver=assigned
                )
                db.add(veh)
                db.commit()
                db.refresh(veh)
                vehicle_ids.append(veh.vehicle_id)
                print(f"[SUCCESS] Vehicle created: {v['brand']} {v['model']} ({v['registration_number']})")
            else:
                vehicle_ids.append(existing_v.vehicle_id)
                print(f"[INFO] Vehicle {v['registration_number']} already exists.")

        # 3. Seed Sample Shipments
        print("\nSeeding sample shipments...")
        shipments_data = [
            {
                "tracking_number": "SHP-402941-US",
                "customer_name": "Alpha Logistics",
                "source": "SF",
                "destination": "LA",
                "shipment_weight": 12500.0,
                "status": "In Transit",
                "cargo_description": json.dumps({"phone": "555-0199", "notes": "Fragile processor chips", "desc": "Processor Chips"}),
            },
            {
                "tracking_number": "SHP-910245-US",
                "customer_name": "Apex Industrial",
                "source": "OAKLAND",
                "destination": "SACRAMENTO",
                "shipment_weight": 8400.0,
                "status": "Created",
                "cargo_description": json.dumps({"phone": "555-0188", "notes": "Keep upright", "desc": "Industrial Gearboxes"}),
            },
            {
                "tracking_number": "SHP-224198-US",
                "customer_name": "Omni ColdCorp",
                "source": "FRESNO",
                "destination": "SJ",
                "shipment_weight": 18000.0,
                "status": "Assigned",
                "cargo_description": json.dumps({"phone": "555-0177", "notes": "Refrigerated storage required", "desc": "Vaccines"}),
            }
        ]

        for i, s in enumerate(shipments_data):
            existing_s = db.query(Shipment).filter(Shipment.tracking_number == s["tracking_number"]).first()
            if not existing_s:
                # Link vehicle and driver to shipments that are Assigned or In Transit
                veh_id = vehicle_ids[i % len(vehicle_ids)] if i > 0 else None
                drv_id = driver_ids[i % len(driver_ids)] if i > 0 else None
                
                ship = Shipment(
                    tracking_number=s["tracking_number"],
                    customer_name=s["customer_name"],
                    source=s["source"],
                    destination=s["destination"],
                    shipment_weight=s["shipment_weight"],
                    status=s["status"],
                    cargo_description=s["cargo_description"],
                    vehicle_id=veh_id,
                    driver_id=drv_id,
                )
                db.add(ship)
                db.commit()
                print(f"[SUCCESS] Shipment created: {s['tracking_number']} ({s['customer_name']})")
                
                # If shipment is "In Transit", create an active trip for it
                if s["status"] == "In Transit":
                    # Link to Tesla Semi MH-12-CA-9482
                    t_veh = db.query(Vehicle).filter(Vehicle.registration_number == "MH-12-CA-9482").first()
                    t_drv = db.query(Driver).filter(Driver.driver_id == driver_ids[0]).first() if driver_ids else None
                    if t_veh and t_drv:
                        t_veh.status = "In Transit"
                        db.add(t_veh)
                        
                        # Set up shipment details
                        ship.vehicle_id = t_veh.vehicle_id
                        ship.driver_id = t_drv.driver_id
                        db.add(ship)
                        db.commit()
                        
                        existing_t = db.query(Trip).filter(Trip.shipment_id == ship.shipment_id).first()
                        if not existing_t:
                            from app.utils.routing import solve_dijkstra_route
                            route_res = solve_dijkstra_route("SF", "LA", "Fastest")
                            trip = Trip(
                                shipment_id=ship.shipment_id,
                                vehicle_id=t_veh.vehicle_id,
                                driver_id=t_drv.driver_id,
                                start_location="SF",
                                destination="LA",
                                cargo="Processor Chips",
                                status="In Transit",
                                distance=route_res["distance"],
                                eta_seconds=route_res["duration"],
                                route_type="Fastest"
                            )
                            db.add(trip)
                            db.commit()
                            print(f"[SUCCESS] Active Trip created for Shipment: {s['tracking_number']}")
            else:
                print(f"[INFO] Shipment {s['tracking_number']} already exists.")

        print("\nDatabase seeding complete!")
    except Exception as e:
        print(f"[ERROR] Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
