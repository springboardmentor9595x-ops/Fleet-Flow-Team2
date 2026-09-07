import uuid
from sqlalchemy.orm import Session
from app.models.trip import Trip
from app.schemas.trip import TripCreate

def get_trips(db: Session, skip: int = 0, limit: int = 100):
    return db.query(Trip).order_by(Trip.created_at.desc()).offset(skip).limit(limit).all()

def get_trip(db: Session, trip_id: uuid.UUID):
    return db.query(Trip).filter(Trip.trip_id == trip_id).first()

def create_trip(db: Session, trip: TripCreate, distance: float, eta_seconds: int, start_lat: float, start_lng: float):
    db_trip = Trip(
        vehicle_id=trip.vehicle_id,
        driver_id=trip.driver_id,
        shipment_id=trip.shipment_id,
        route_type=trip.route_type,
        start_location=trip.start_location,
        destination=trip.destination,
        cargo=trip.cargo,
        status="Scheduled",
        distance=distance,
        eta_seconds=eta_seconds,
        current_lat=start_lat,
        current_lng=start_lng
    )
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

def update_trip_status(db: Session, db_trip: Trip, status: str):
    db_trip.status = status
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

def update_trip_coords(db: Session, db_trip: Trip, lat: float, lng: float, eta_seconds: int):
    db_trip.current_lat = lat
    db_trip.current_lng = lng
    db_trip.eta_seconds = eta_seconds
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

def delete_trip(db: Session, db_trip: Trip):
    db.delete(db_trip)
    db.commit()
    return True
