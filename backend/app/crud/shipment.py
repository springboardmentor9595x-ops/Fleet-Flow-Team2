import uuid
import random
from sqlalchemy.orm import Session
from app.models.shipment import Shipment
from app.models.driver import Driver
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate

from app.models.vehicle import Vehicle

def get_shipments(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Shipment).order_by(Shipment.created_at.desc()).offset(skip).limit(limit).all()

def get_shipments_by_driver(db: Session, user_id: uuid.UUID):
    driver = db.query(Driver).filter(Driver.user_id == user_id).first()
    if not driver:
        return []
    return db.query(Shipment).filter(Shipment.driver_id == driver.driver_id).order_by(Shipment.created_at.desc()).all()

def get_shipment(db: Session, shipment_id: uuid.UUID):
    return db.query(Shipment).filter(Shipment.shipment_id == shipment_id).first()

def create_shipment(db: Session, shipment: ShipmentCreate):
    if shipment.tracking_number:
        tracking_number = shipment.tracking_number
    else:
        # Generate unique tracking number (e.g. SHP-100249-US)
        rand_seq = random.randint(100000, 999999)
        tracking_number = f"SHP-{rand_seq}-US"

    db_shipment = Shipment(
        tracking_number=tracking_number,
        source=shipment.source.upper(),
        destination=shipment.destination.upper(),
        customer_name=shipment.customer_name,
        shipment_weight=shipment.shipment_weight,
        cargo_description=shipment.cargo_description,
        status="Assigned" if (shipment.vehicle_id or shipment.driver_id) else "Created",
        expected_delivery_time=shipment.expected_delivery_time,
        vehicle_id=shipment.vehicle_id,
        driver_id=shipment.driver_id
    )
    db.add(db_shipment)
    
    # Automatically mark vehicle as Assigned when a shipment is created with it
    if shipment.vehicle_id:
        veh = db.query(Vehicle).filter(Vehicle.vehicle_id == shipment.vehicle_id).first()
        if veh:
            veh.status = "Assigned"
            db.add(veh)

    # Automatically mark driver as Assigned when a shipment is created with it
    if shipment.driver_id:
        drv = db.query(Driver).filter(Driver.driver_id == shipment.driver_id).first()
        if drv:
            drv.status = "Assigned"
            db.add(drv)

    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def update_shipment(db: Session, db_shipment: Shipment, shipment: ShipmentUpdate):
    old_vehicle_id = db_shipment.vehicle_id
    new_vehicle_id = shipment.vehicle_id
    
    old_driver_id = db_shipment.driver_id
    new_driver_id = shipment.driver_id
    
    update_data = shipment.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["source", "destination"] and value is not None:
            value = value.upper()
        setattr(db_shipment, key, value)
    db.add(db_shipment)

    # Sync vehicle status on assignment updates
    if old_vehicle_id != new_vehicle_id:
        if old_vehicle_id:
            old_veh = db.query(Vehicle).filter(Vehicle.vehicle_id == old_vehicle_id).first()
            if old_veh:
                old_veh.status = "Available"
                db.add(old_veh)
        if new_vehicle_id:
            new_veh = db.query(Vehicle).filter(Vehicle.vehicle_id == new_vehicle_id).first()
            if new_veh:
                new_veh.status = "Assigned"
                db.add(new_veh)

    # Sync driver status on assignment updates
    if old_driver_id != new_driver_id:
        if old_driver_id:
            old_drv = db.query(Driver).filter(Driver.driver_id == old_driver_id).first()
            if old_drv:
                old_drv.status = "Available"
                db.add(old_drv)
        if new_driver_id:
            new_drv = db.query(Driver).filter(Driver.driver_id == new_driver_id).first()
            if new_drv:
                new_drv.status = "Assigned"
                db.add(new_drv)

    # If shipment status becomes Delivered or Cancelled, release the vehicle and driver to Available
    if shipment.status in ["Delivered", "Cancelled"]:
        if db_shipment.vehicle_id:
            veh = db.query(Vehicle).filter(Vehicle.vehicle_id == db_shipment.vehicle_id).first()
            if veh:
                veh.status = "Available"
                db.add(veh)
        if db_shipment.driver_id:
            drv = db.query(Driver).filter(Driver.driver_id == db_shipment.driver_id).first()
            if drv:
                drv.status = "Available"
                db.add(drv)

    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, db_shipment: Shipment):
    db_shipment.status = "Cancelled"
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return True

def get_shipment_history(db: Session, filter_key: str, filter_val: any):
    if filter_key == "vehicle":
        return db.query(Shipment).filter(Shipment.vehicle_id == filter_val).order_by(Shipment.created_at.desc()).all()
    elif filter_key == "driver":
        return db.query(Shipment).filter(Shipment.driver_id == filter_val).order_by(Shipment.created_at.desc()).all()
    elif filter_key == "customer":
        return db.query(Shipment).filter(Shipment.customer_name.ilike(f"%{filter_val}%")).order_by(Shipment.created_at.desc()).all()
    return []
