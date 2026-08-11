import uuid
from sqlalchemy.orm import Session
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


def get_vehicles(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Vehicle).offset(skip).limit(limit).all()


def get_vehicle(db: Session, vehicle_id: uuid.UUID):
    return db.query(Vehicle).filter(Vehicle.vehicle_id == vehicle_id).first()


def get_vehicle_by_registration(db: Session, registration_number: str):
    return db.query(Vehicle).filter(Vehicle.registration_number == registration_number).first()


def create_vehicle(db: Session, vehicle: VehicleCreate):
    db_vehicle = Vehicle(
        registration_number=vehicle.registration_number.upper(),
        vehicle_type=vehicle.vehicle_type,
        brand=vehicle.brand,
        model=vehicle.model,
        manufacture_year=vehicle.manufacture_year,
        fuel_type=vehicle.fuel_type,
        capacity=vehicle.capacity,
        assigned_driver=vehicle.assigned_driver,
        status=vehicle.status,
    )
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def update_vehicle(db: Session, db_vehicle: Vehicle, vehicle: VehicleUpdate):
    update_data = vehicle.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == "registration_number" and value is not None:
            value = value.upper()
        setattr(db_vehicle, key, value)
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle


def delete_vehicle(db: Session, db_vehicle: Vehicle):
    db.delete(db_vehicle)
    db.commit()
    return True
