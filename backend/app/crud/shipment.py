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
    from app.models.trip import Trip
    from sqlalchemy import or_
    trip_shipment_tuples = db.query(Trip.shipment_id).filter(Trip.driver_id == driver.driver_id, Trip.shipment_id.isnot(None)).all()
    trip_shipment_ids = [t[0] for t in trip_shipment_tuples if t[0] is not None]
    
    if trip_shipment_ids:
        return db.query(Shipment).filter(
            or_(
                Shipment.driver_id == driver.driver_id,
                Shipment.shipment_id.in_(trip_shipment_ids)
            )
        ).order_by(Shipment.created_at.desc()).all()
    
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

    # Always dispatch contractor email updates on creation if email is configured
    try:
        from app.routers.trips import notify_shipment_status_change
        driver_name = drv.user.full_name if (shipment.driver_id and drv and getattr(drv, 'user', None)) else None
        vehicle_plate = veh.license_plate if (shipment.vehicle_id and veh) else None
        notify_shipment_status_change(
            db_shipment,
            status=db_shipment.status,
            driver_name=driver_name,
            vehicle_plate=vehicle_plate,
            stage="created"
        )
    except Exception as e:
        print(f"[Crud Shipment Create Notification Error] {e}")

    # Broadcast In-App Notification to Driver & Dispatcher
    try:
        from app.routers.notifications import create_and_broadcast_notification
        if shipment.driver_id and drv and getattr(drv, 'user_id', None):
            create_and_broadcast_notification(
                db=db,
                title="🚚 YOU HAVE BEEN ASSIGNED",
                message=f"You are assigned to shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}).",
                type="assignment",
                user_id=drv.user_id,
                target_role="Driver"
            )

        create_and_broadcast_notification(
            db=db,
            title="📦 SHIPMENT REGISTERED",
            message=f"Shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}) is registered and awaiting trip dispatch.",
            type="info",
            target_role="Dispatcher"
        )
    except Exception as e:
        print(f"[Shipment In-App Notification Warning] {e}")

    return db_shipment

def update_shipment(db: Session, db_shipment: Shipment, shipment: ShipmentUpdate):
    old_vehicle_id = db_shipment.vehicle_id
    old_driver_id = db_shipment.driver_id
    
    update_data = shipment.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["source", "destination"] and value is not None:
            value = value.upper()
        setattr(db_shipment, key, value)
    db.add(db_shipment)

    # Find the linked trip if it exists
    from app.models.trip import Trip
    db_trip = db.query(Trip).filter(Trip.shipment_id == db_shipment.shipment_id).first()

    # Sync vehicle status on assignment updates
    if "vehicle_id" in update_data:
        new_vehicle_id = update_data["vehicle_id"]
        if old_vehicle_id != new_vehicle_id:
            if old_vehicle_id:
                old_veh = db.query(Vehicle).filter(Vehicle.vehicle_id == old_vehicle_id).first()
                if old_veh:
                    old_veh.status = "Available"
                    db.add(old_veh)
            if new_vehicle_id:
                new_veh = db.query(Vehicle).filter(Vehicle.vehicle_id == new_vehicle_id).first()
                if new_veh:
                    new_veh.status = "In Transit" if (db_trip and db_trip.status == "In Transit") else "Assigned"
                    db.add(new_veh)
            
            # Sync the linked trip's vehicle
            if db_trip:
                db_trip.vehicle_id = new_vehicle_id
                db.add(db_trip)

    # Sync driver status on assignment updates
    if "driver_id" in update_data:
        new_driver_id = update_data["driver_id"]
        if old_driver_id != new_driver_id:
            if old_driver_id:
                old_drv = db.query(Driver).filter(Driver.driver_id == old_driver_id).first()
                if old_drv:
                    old_drv.status = "Available"
                    db.add(old_drv)
                    # Notify old driver of removal
                    try:
                        from app.routers.notifications import create_and_broadcast_notification
                        if getattr(old_drv, 'user_id', None):
                            create_and_broadcast_notification(
                                db=db,
                                title="ℹ️ ASSIGNMENT REASSIGNED",
                                message=f"Your assignment for shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}) has been removed.",
                                type="warning",
                                user_id=old_drv.user_id,
                                target_role="Driver"
                            )
                    except Exception as e:
                        print(f"[Driver Reassign Notification Error] {e}")

            if new_driver_id:
                new_drv = db.query(Driver).filter(Driver.driver_id == new_driver_id).first()
                if new_drv:
                    new_drv.status = "In Transit" if (db_trip and db_trip.status == "In Transit") else "Assigned"
                    db.add(new_drv)
                    # Notify new driver of assignment
                    try:
                        from app.routers.notifications import create_and_broadcast_notification
                        if getattr(new_drv, 'user_id', None):
                            create_and_broadcast_notification(
                                db=db,
                                title="🚚 YOU HAVE BEEN ASSIGNED",
                                message=f"You are assigned to shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}).",
                                type="assignment",
                                user_id=new_drv.user_id,
                                target_role="Driver"
                            )
                    except Exception as e:
                        print(f"[Driver Assignment Notification Error] {e}")

            # Sync the linked trip's driver
            if db_trip:
                db_trip.driver_id = new_driver_id
                db.add(db_trip)

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
        # Also complete/cancel the corresponding trip
        if db_trip:
            db_trip.status = "Completed" if shipment.status == "Delivered" else "Cancelled"
            if shipment.status == "Delivered":
                db_trip.end_time = datetime.utcnow()
            db.add(db_trip)

        # Broadcast status notifications
        try:
            from app.routers.notifications import create_and_broadcast_notification
            if shipment.status == "Cancelled":
                if db_shipment.driver_id and drv and getattr(drv, 'user_id', None):
                    create_and_broadcast_notification(
                        db=db,
                        title="🚫 SHIPMENT CANCELLED",
                        message=f"Shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}) has been cancelled.",
                        type="warning",
                        user_id=drv.user_id,
                        target_role="Driver"
                    )
                create_and_broadcast_notification(
                    db=db,
                    title="🚫 SHIPMENT CANCELLED",
                    message=f"Shipment [{db_shipment.tracking_number}] ({db_shipment.source} ➔ {db_shipment.destination}) has been cancelled.",
                    type="warning",
                    target_role="Dispatcher"
                )
            elif shipment.status == "Delivered":
                if db_shipment.driver_id and drv and getattr(drv, 'user_id', None):
                    create_and_broadcast_notification(
                        db=db,
                        title="🎉 SHIPMENT DELIVERED",
                        message=f"Shipment [{db_shipment.tracking_number}] delivered safely to {db_shipment.destination}.",
                        type="delivery",
                        user_id=drv.user_id,
                        target_role="Driver"
                    )
                create_and_broadcast_notification(
                    db=db,
                    title="🎉 SHIPMENT DELIVERED",
                    message=f"Shipment [{db_shipment.tracking_number}] delivered safely to {db_shipment.destination}.",
                    type="delivery",
                    target_role="Dispatcher"
                )
        except Exception as e:
            print(f"[Shipment Status Notification Error] {e}")

    # Always dispatch contractor email updates on status changes
    if "status" in update_data:
        try:
            from app.routers.trips import notify_shipment_status_change
            notify_shipment_status_change(db_shipment, db_shipment.status)
        except Exception as e:
            print(f"[Crud Shipment Notification Error] {e}")

    db.commit()
    db.refresh(db_shipment)
    return db_shipment

def delete_shipment(db: Session, db_shipment: Shipment):
    from app.models.trip import Trip
    from app.models.vehicle import Vehicle
    from app.models.driver import Driver
    from app.models.gps_tracking import GPSTracking
    
    # 1. When a Shipment is deleted, cascade delete any linked Trip as well
    linked_trips = db.query(Trip).filter(Trip.shipment_id == db_shipment.shipment_id).all()
    for trip in linked_trips:
        db.delete(trip)
    
    # 2. Release assigned vehicle back to Available
    if db_shipment.vehicle_id:
        veh = db.query(Vehicle).filter(Vehicle.vehicle_id == db_shipment.vehicle_id).first()
        if veh:
            veh.status = "Available"
            db.add(veh)
            
    # 3. Release assigned driver back to Available
    if db_shipment.driver_id:
        drv = db.query(Driver).filter(Driver.driver_id == db_shipment.driver_id).first()
        if drv:
            drv.status = "Available"
            db.add(drv)

    # 4. Permanently delete the shipment record from PostgreSQL
    db.delete(db_shipment)
    db.commit()
    return True

def get_shipment_history(db: Session, filter_key: str, filter_val: any):
    if filter_key == "vehicle":
        return db.query(Shipment).filter(Shipment.vehicle_id == filter_val).order_by(Shipment.created_at.desc()).all()
    elif filter_key == "driver":
        return db.query(Shipment).filter(Shipment.driver_id == filter_val).order_by(Shipment.created_at.desc()).all()
    elif filter_key == "customer":
        return db.query(Shipment).filter(Shipment.customer_name.ilike(f"%{filter_val}%")).order_by(Shipment.created_at.desc()).all()
    return []
