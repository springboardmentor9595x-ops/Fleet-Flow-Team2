import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.schemas.trip import TripCreate, TripUpdateStatus, TripOut
from app.crud.trip import get_trips, get_trip, create_trip, update_trip_status, delete_trip
from app.utils.routing import solve_dijkstra_route, geocode_address, DEPOTS
from app.core.deps import get_current_user

router = APIRouter()

def notify_shipment_status_change(shipment, status: str):
    import json
    import threading
    from app.utils.mail import send_shipment_status_email
    
    if not shipment or not shipment.cargo_description:
        return
        
    try:
        desc_data = json.loads(shipment.cargo_description)
        email = desc_data.get("email")
        if email and "@" in email:
            t = threading.Thread(
                target=send_shipment_status_email,
                args=(email, shipment.tracking_number, shipment.customer_name, status, shipment.source, shipment.destination)
            )
            t.start()
    except Exception as e:
        print(f"[Shipment Notification Error] {e}")

class RecalculatePayload(BaseModel):
    current_lat: float | None = None
    current_lng: float | None = None
    new_destination: str | None = None
    route_type: str | None = None

@router.get("/", response_model=list[TripOut])
def read_trips(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_trips(db, skip=skip, limit=limit)

@router.post("/", response_model=TripOut, status_code=status.HTTP_201_CREATED)
def dispatch_trip(
    trip: TripCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Driver is unauthorized to dispatch)
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    # Validate locations are distinct
    start_loc = trip.start_location.strip()
    end_loc = trip.destination.strip()
    if start_loc.upper() == end_loc.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Start and destination locations must be distinct."
        )

    # Resolve coordinates
    start_coords = geocode_address(start_loc)
    end_coords = geocode_address(end_loc)
    if not start_coords:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to geocode start location: {start_loc}"
        )
    if not end_coords:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to geocode destination location: {end_loc}"
        )

    # Solve optimal OSRM route
    route_details = solve_dijkstra_route(start_loc, end_loc, trip.route_type)
    if not route_details["coords"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No routable pathway found between specified locations."
        )

    # Get starting coordinate point
    start_lat = route_details["coords"][0]["lat"]
    start_lng = route_details["coords"][0]["lng"]

    # Link shipment if provided
    if trip.shipment_id:
        from app.models.shipment import Shipment
        shipment = db.query(Shipment).filter(Shipment.shipment_id == trip.shipment_id).first()
        if shipment:
            shipment.status = "Assigned"
            if trip.vehicle_id:
                shipment.vehicle_id = trip.vehicle_id
            if trip.driver_id:
                shipment.driver_id = trip.driver_id
            db.add(shipment)

    return create_trip(
        db=db,
        trip=trip,
        distance=route_details["distance"],
        eta_seconds=route_details["duration"],
        start_lat=start_lat,
        start_lng=start_lng
    )

@router.put("/{trip_id}/status", response_model=TripOut)
def edit_trip_status(
    trip_id: uuid.UUID,
    payload: TripUpdateStatus,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    # Only drivers are authorized to update/complete a trip once it has departed (is In Transit)
    if db_trip.status == "In Transit" and current_user.role.value.upper() != "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="In-transit trip updates can only be handled by the driver."
        )

    new_status = payload.status
    if new_status not in ["Scheduled", "In Transit", "Completed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be Scheduled, In Transit, or Completed."
        )

    from app.models.shipment import Shipment
    from app.models.vehicle import Vehicle
    from app.models.driver import Driver
    
    # 1. Depart trip
    if new_status == "In Transit" and db_trip.status != "In Transit":
        db_trip.start_time = datetime.utcnow()
        if db_trip.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_trip.vehicle_id).first()
            if vehicle:
                vehicle.status = "In Transit"
                db.add(vehicle)
        if db_trip.driver_id:
            driver = db.query(Driver).filter(Driver.driver_id == db_trip.driver_id).first()
            if driver:
                driver.status = "In Transit"
                db.add(driver)
        if db_trip.shipment_id:
            shipment = db.query(Shipment).filter(Shipment.shipment_id == db_trip.shipment_id).first()
            if shipment:
                shipment.status = "In Transit"
                db.add(shipment)
                notify_shipment_status_change(shipment, "Departed")
                
    # 2. Arrive trip
    elif new_status == "Completed" and db_trip.status != "Completed":
        db_trip.end_time = datetime.utcnow()
        if db_trip.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_trip.vehicle_id).first()
            if vehicle:
                vehicle.status = "Available"  # Force vehicle status to Available
                db.add(vehicle)
        if db_trip.driver_id:
            driver = db.query(Driver).filter(Driver.driver_id == db_trip.driver_id).first()
            if driver:
                driver.status = "Available"  # Force driver status to Available
                db.add(driver)
        if db_trip.shipment_id:
            shipment = db.query(Shipment).filter(Shipment.shipment_id == db_trip.shipment_id).first()
            if shipment:
                shipment.status = "Delivered"
                db.add(shipment)
                notify_shipment_status_change(shipment, "Completed")
                
    return update_trip_status(db=db, db_trip=db_trip, status=new_status)

@router.post("/{trip_id}/recalculate", response_model=TripOut)
def recalculate_trip_route(
    trip_id: uuid.UUID,
    payload: RecalculatePayload,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    # Only drivers are authorized to update/recalculate a trip once it has departed (is In Transit)
    if db_trip.status == "In Transit" and current_user.role.value.upper() != "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="In-transit trip updates can only be handled by the driver."
        )
        
    start_loc = db_trip.start_location
    end_loc = db_trip.destination
    
    if payload.new_destination:
        end_loc = payload.new_destination
        db_trip.destination = end_loc
        
    route_type = payload.route_type or db_trip.route_type or "Fastest"
    db_trip.route_type = route_type
    
    if payload.current_lat is not None and payload.current_lng is not None:
        start_lat_str = f"{payload.current_lat},{payload.current_lng}"
        route_details = solve_dijkstra_route(start_lat_str, end_loc, route_type)
    else:
        route_details = solve_dijkstra_route(start_loc, end_loc, route_type)
        
    if not route_details["coords"]:
        raise HTTPException(status_code=400, detail="Could not recalculate route path")
        
    db_trip.distance = route_details["distance"]
    db_trip.eta_seconds = route_details["duration"]
    db_trip.current_lat = route_details["coords"][0]["lat"]
    db_trip.current_lng = route_details["coords"][0]["lng"]
    
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return db_trip

@router.delete("/{trip_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_trip(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Driver is unauthorized)
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    # Release linked shipment and vehicle status
    from app.models.shipment import Shipment
    from app.models.vehicle import Vehicle
    if db_trip.shipment_id:
        shipment = db.query(Shipment).filter(Shipment.shipment_id == db_trip.shipment_id).first()
        if shipment:
            shipment.status = "Created"
            db.add(shipment)
    if db_trip.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_trip.vehicle_id).first()
        if vehicle:
            vehicle.status = "Assigned" if vehicle.assigned_driver else "Available"
            db.add(vehicle)
    db.commit()

    delete_trip(db=db, db_trip=db_trip)
    return None

@router.post("/simulate-ping")
async def simulate_gps_ping(db: Session = Depends(get_db)):
    import asyncio
    import json
    from app.models.trip import Trip
    from app.models.shipment import Shipment
    from app.routers.websockets import SIMULATION_STEPS, downsample_coords, manager, redis_pubsub_available, r_pubsub
    
    active_trips = db.query(Trip).filter(Trip.status == "In Transit").all()
    
    for trip in active_trips:
        trip_uuid = str(trip.trip_id)
        route_type = trip.route_type or "Fastest"
        route_details = await asyncio.to_thread(solve_dijkstra_route, trip.start_location, trip.destination, route_type)
        if not route_details["coords"]:
            continue
            
        detailed_coords = downsample_coords(route_details["coords"], target_len=15)
        total_steps = len(detailed_coords)
        curr_step = SIMULATION_STEPS.get(trip_uuid, 0)
        
        is_arrived = False
        if curr_step >= total_steps - 1:
            is_arrived = True
            coord = detailed_coords[-1]
        else:
            next_step = curr_step + 1
            SIMULATION_STEPS[trip_uuid] = next_step
            coord = detailed_coords[next_step]
            
        # Update coordinates in DB
        trip.current_lat = coord["lat"]
        trip.current_lng = coord["lng"]
        
        remaining_fraction = 1.0 - (curr_step / max(1, total_steps - 1))
        eta_remaining = int(route_details["duration"] * remaining_fraction) if not is_arrived else 0
        trip.eta_seconds = eta_remaining
        
        if is_arrived:
            trip.status = "Completed"
            trip.end_time = datetime.utcnow()
            if trip.shipment_id:
                shipment = db.query(Shipment).filter(Shipment.shipment_id == trip.shipment_id).first()
                if shipment:
                    shipment.status = "Delivered"
            if trip.vehicle:
                trip.vehicle.status = "Depot"
            SIMULATION_STEPS.pop(trip_uuid, None)
            
        db.add(trip)
        
        license_plate = trip.vehicle.license_plate if trip.vehicle else "FF-MOCK"
        driver_name = trip.driver.user.full_name if (trip.driver and trip.driver.user) else "Operator"
        
        payload = {
            "type": "TELEMETRY_UPDATE",
            "active_trips": [{
                "trip_id": trip_uuid,
                "license_plate": license_plate,
                "driver_name": driver_name,
                "lat": coord["lat"],
                "lng": coord["lng"],
                "status": trip.status,
                "eta_seconds": eta_remaining,
                "cargo": trip.cargo,
                "route_type": route_type,
                "distance_remaining": round(route_details["distance"] * remaining_fraction, 1),
                "route_coords": [[c["lat"], c["lng"]] for c in detailed_coords]
            }]
        }
        
        if redis_pubsub_available and r_pubsub:
            r_pubsub.publish("telemetry_channel", json.dumps(payload))
        else:
            await manager.broadcast(payload)
            
    db.commit()
    return {"status": "success", "message": f"Simulated GPS ping for {len(active_trips)} active dispatches."}
