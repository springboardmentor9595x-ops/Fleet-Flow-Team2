def notify_trip_cargo_status_change(
    trip,
    status: str,
    driver_name: str | None = None,
    vehicle_plate: str | None = None,
    checkpoint_city: str | None = None,
    distance_remaining: float | None = None,
    eta_str: str | None = None,
    stage: str | None = None
):
    import json
    from app.utils.mail import dispatch_customer_lifecycle_email
    
    if not trip:
        return
        
    email = None
    customer_name = "Valued Customer"
    
    if trip.cargo:
        try:
            if trip.cargo.strip().startswith("{"):
                desc_data = json.loads(trip.cargo)
                email = desc_data.get("email")
                if desc_data.get("name"):
                    customer_name = desc_data.get("name")
        except Exception:
            pass
            
    resolved_driver = driver_name
    if not resolved_driver and getattr(trip, 'driver', None) and getattr(trip.driver, 'user', None):
        resolved_driver = trip.driver.user.full_name
        
    resolved_vehicle = vehicle_plate
    if not resolved_vehicle and getattr(trip, 'vehicle', None):
        resolved_vehicle = getattr(trip.vehicle, 'registration_number', None) or getattr(trip.vehicle, 'license_plate', None)
        
    if email and "@" in email:
        dispatch_customer_lifecycle_email(
            to_email=email,
            tracking_number=f"TRK-{str(trip.trip_id)[:8].upper()}",
            customer_name=customer_name,
            status=status,
            source=trip.start_location,
            destination=trip.destination,
            driver_name=resolved_driver,
            vehicle_plate=resolved_vehicle,
            checkpoint_city=checkpoint_city,
            distance_remaining=distance_remaining,
            eta_str=eta_str,
            stage=stage or status
        )

import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.schemas.trip import TripCreate, TripUpdateStatus, TripOut, TripReviewCreate
from app.crud.trip import get_trips, get_trip, create_trip, update_trip_status, delete_trip
from app.utils.routing import solve_dijkstra_route, geocode_address, DEPOTS
from app.core.deps import get_current_user

router = APIRouter()

def notify_shipment_status_change(
    shipment,
    status: str,
    driver_name: str | None = None,
    vehicle_plate: str | None = None,
    checkpoint_city: str | None = None,
    distance_remaining: float | None = None,
    eta_str: str | None = None,
    stage: str | None = None
):
    import json
    from app.utils.mail import dispatch_customer_lifecycle_email
    
    if not shipment:
        return
        
    try:
        email = None
        if shipment.cargo_description:
            try:
                desc_data = json.loads(shipment.cargo_description)
                email = desc_data.get("email")
            except Exception:
                pass
                
        resolved_driver = driver_name
        if not resolved_driver and getattr(shipment, 'driver', None) and getattr(shipment.driver, 'user', None):
            resolved_driver = shipment.driver.user.full_name
            
        resolved_vehicle = vehicle_plate
        if not resolved_vehicle and getattr(shipment, 'vehicle', None):
            resolved_vehicle = getattr(shipment.vehicle, 'registration_number', None) or getattr(shipment.vehicle, 'license_plate', None)
            
        dispatch_customer_lifecycle_email(
            to_email=email,
            tracking_number=shipment.tracking_number,
            customer_name=shipment.customer_name or "Valued Customer",
            status=status,
            source=shipment.source,
            destination=shipment.destination,
            driver_name=resolved_driver,
            vehicle_plate=resolved_vehicle,
            checkpoint_city=checkpoint_city,
            distance_remaining=distance_remaining,
            eta_str=eta_str,
            stage=stage or status
        )
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
    role_upper = current_user.role.value.upper() if hasattr(current_user.role, 'value') else str(current_user.role).upper()
    if role_upper == "DRIVER":
        from app.models.driver import Driver
        from app.models.trip import Trip
        driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not driver:
            return []
        return db.query(Trip).filter(Trip.driver_id == driver.driver_id).order_by(Trip.created_at.desc()).all()

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
            old_shipment_vehicle_id = shipment.vehicle_id
            old_shipment_driver_id = shipment.driver_id

            shipment.status = "Assigned"
            if trip.vehicle_id:
                shipment.vehicle_id = trip.vehicle_id
            if trip.driver_id:
                shipment.driver_id = trip.driver_id
            db.add(shipment)

            # Release old shipment vehicle if it has changed
            if old_shipment_vehicle_id and old_shipment_vehicle_id != trip.vehicle_id:
                from app.models.vehicle import Vehicle
                old_veh = db.query(Vehicle).filter(Vehicle.vehicle_id == old_shipment_vehicle_id).first()
                if old_veh:
                    old_veh.status = "Available"
                    db.add(old_veh)

            # Release old shipment driver if it has changed
            if old_shipment_driver_id and old_shipment_driver_id != trip.driver_id:
                from app.models.driver import Driver
                old_drv = db.query(Driver).filter(Driver.driver_id == old_shipment_driver_id).first()
                if old_drv:
                    old_drv.status = "Available"
                    db.add(old_drv)

    # Update new driver and vehicle status to Assigned
    if trip.vehicle_id:
        from app.models.vehicle import Vehicle
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == trip.vehicle_id).first()
        if vehicle:
            vehicle.status = "Assigned"
            db.add(vehicle)

    if trip.driver_id:
        from app.models.driver import Driver
        driver = db.query(Driver).filter(Driver.driver_id == trip.driver_id).first()
        if driver:
            driver.status = "Assigned"
            db.add(driver)

    new_db_trip = create_trip(
        db=db,
        trip=trip,
        distance=route_details["distance"],
        eta_seconds=route_details["duration"],
        start_lat=start_lat,
        start_lng=start_lng
    )

    # Dispatch Stage 2 Email: Trip Scheduled
    if trip.shipment_id:
        from app.models.shipment import Shipment
        shp = db.query(Shipment).filter(Shipment.shipment_id == trip.shipment_id).first()
        if shp:
            d_name = driver.user.full_name if (trip.driver_id and driver and getattr(driver, 'user', None)) else None
            v_plate = vehicle.license_plate if (trip.vehicle_id and vehicle) else None
            notify_shipment_status_change(
                shp,
                status="Assigned",
                driver_name=d_name,
                vehicle_plate=v_plate,
                stage="trip_scheduled"
            )

    # In-App Notification for Driver & Dispatcher
    try:
        from app.routers.notifications import create_and_broadcast_notification
        d_user_id = driver.user_id if (trip.driver_id and driver and getattr(driver, 'user_id', None)) else None
        
        # Notify assigned driver
        if d_user_id:
            create_and_broadcast_notification(
                db=db,
                title="🚚 NEW TRIP ASSIGNMENT",
                message=f"You have been assigned to Trip: {trip.start_location} ➔ {trip.destination}.",
                type="assignment",
                user_id=d_user_id,
                target_role="Driver"
            )
        
        # Notify Dispatchers
        create_and_broadcast_notification(
            db=db,
            title="📋 TRIP DISPATCHED",
            message=f"Trip from {trip.start_location} to {trip.destination} created with driver assignment.",
            type="assignment",
            target_role="Dispatcher"
        )
    except Exception as e:
        print(f"[Trip Assignment Notification] Warning: {e}")

    return new_db_trip

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

    # 1. Completed Trips are STRICTLY LOCKED (Cannot edit back to in-transit, shipment, or trip options)
    if db_trip.status in ["Completed", "Delivered"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed trips are locked and cannot be edited. They can only be viewed or deleted by authorized roles."
        )

    # 2. In Transit forward progression check (Cannot revert back to Scheduled)
    new_status = payload.status
    if db_trip.status == "In Transit" and new_status == "Scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="In-transit trips cannot be reverted backwards to Scheduled. You can only complete or cancel the trip."
        )

    if new_status not in ["Scheduled", "In Transit", "Completed", "Cancelled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be Scheduled, In Transit, Completed, or Cancelled."
        )

    # Only drivers are authorized to update/complete a trip once it has departed (is In Transit)
    if db_trip.status == "In Transit" and current_user.role.value.upper() == "DRIVER" and new_status not in ["Completed", "In Transit"]:
        pass

    from app.models.shipment import Shipment
    from app.models.vehicle import Vehicle
    from app.models.driver import Driver
    
    # 1. Depart trip / Start Transit (also allows restarting a cancelled trip)
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
                d_name = db_trip.driver.user.full_name if (db_trip.driver and getattr(db_trip.driver, 'user', None)) else None
                v_plate = db_trip.vehicle.license_plate if db_trip.vehicle else None
                notify_shipment_status_change(
                    shipment,
                    status="Departed",
                    driver_name=d_name,
                    vehicle_plate=v_plate,
                    stage="departed"
                )

        try:
            from app.routers.notifications import create_and_broadcast_notification
            v_plate = db_trip.vehicle.license_plate if db_trip.vehicle else None
            if db_trip.driver and getattr(db_trip.driver, 'user_id', None):
                create_and_broadcast_notification(
                    db=db,
                    title="🚚 TRIP IN TRANSIT",
                    message=f"Trip from {db_trip.start_location} to {db_trip.destination} is now in transit.",
                    type="info",
                    user_id=db_trip.driver.user_id,
                    target_role="Driver"
                )
            create_and_broadcast_notification(
                db=db,
                title="🚚 TRIP IN TRANSIT",
                message=f"Vehicle {v_plate or 'Fleet Unit'} departed {db_trip.start_location} towards {db_trip.destination}.",
                type="info",
                target_role="Dispatcher"
            )
        except Exception as e:
            print(f"[Trip Depart Notification Warning] {e}")
                
    # 2. Complete / Arrive trip
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
                d_name = db_trip.driver.user.full_name if (db_trip.driver and getattr(db_trip.driver, 'user', None)) else None
                v_plate = db_trip.vehicle.license_plate if db_trip.vehicle else None
                notify_shipment_status_change(
                    shipment,
                    status="Completed",
                    driver_name=d_name,
                    vehicle_plate=v_plate,
                    stage="completed"
                )

        try:
            from app.routers.notifications import create_and_broadcast_notification
            if db_trip.driver and getattr(db_trip.driver, 'user_id', None):
                create_and_broadcast_notification(
                    db=db,
                    title="🎉 TRIP COMPLETED",
                    message=f"Trip from {db_trip.start_location} to {db_trip.destination} marked Completed. Thank you!",
                    type="delivery",
                    user_id=db_trip.driver.user_id,
                    target_role="Driver"
                )
            create_and_broadcast_notification(
                db=db,
                title="🎉 TRIP COMPLETED",
                message=f"Trip from {db_trip.start_location} to {db_trip.destination} completed and delivered.",
                type="delivery",
                target_role="Dispatcher"
            )
        except Exception as e:
            print(f"[Trip Complete Notification Warning] {e}")

    # 3. Cancel trip (frees up vehicle and driver)
    elif new_status == "Cancelled" and db_trip.status != "Cancelled":
        if db_trip.vehicle_id:
            vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_trip.vehicle_id).first()
            if vehicle:
                vehicle.status = "Available"
                db.add(vehicle)
        if db_trip.driver_id:
            driver = db.query(Driver).filter(Driver.driver_id == db_trip.driver_id).first()
            if driver:
                driver.status = "Available"
                db.add(driver)
        if db_trip.shipment_id:
            shipment = db.query(Shipment).filter(Shipment.shipment_id == db_trip.shipment_id).first()
            if shipment:
                shipment.status = "Cancelled"
                db.add(shipment)

        try:
            from app.routers.notifications import create_and_broadcast_notification
            if db_trip.driver and getattr(db_trip.driver, 'user_id', None):
                create_and_broadcast_notification(
                    db=db,
                    title="🚫 TRIP CANCELLED",
                    message=f"Trip from {db_trip.start_location} to {db_trip.destination} has been cancelled.",
                    type="warning",
                    user_id=db_trip.driver.user_id,
                    target_role="Driver"
                )
            create_and_broadcast_notification(
                db=db,
                title="🚫 TRIP CANCELLED",
                message=f"Trip from {db_trip.start_location} to {db_trip.destination} has been cancelled.",
                type="warning",
                target_role="Dispatcher"
            )
        except Exception as e:
            print(f"[Trip Cancel Notification Warning] {e}")
                
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

    user_role = current_user.role.value.upper() if hasattr(current_user.role, 'value') else str(current_user.role).upper()
    if user_role not in ["ADMIN", "FLEETMANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Route optimization controls are restricted to Fleet Managers and Administrators."
        )

    if (db_trip.status or "").upper() in ["COMPLETED", "DELIVERED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot recalculate route on a completed trip."
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

@router.get("/{trip_id}/strategies")
async def get_trip_strategies(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import asyncio
    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    start_loc = db_trip.start_location
    end_loc = db_trip.destination
    curr_strategy = (db_trip.route_type or "Shortest").strip()

    strategies_config = [
        {"id": "Fastest", "name": "Fastest Route", "delay": "+2m delay", "delay_type": "delay", "dist_mult": 1.0526, "dur_mult": 0.9074},
        {"id": "Shortest", "name": "Shortest Route", "delay": "+5m delay", "delay_type": "delay", "dist_mult": 1.0, "dur_mult": 1.0},
        {"id": "Traffic Avoidance", "name": "Traffic Avoidance Route", "delay": "Clear", "delay_type": "clear", "dist_mult": 1.1368, "dur_mult": 0.8148},
        {"id": "Fuel Efficient", "name": "Fuel-Efficient Route", "delay": "+1m delay", "delay_type": "delay", "dist_mult": 1.0315, "dur_mult": 0.9259}
    ]

    base_route = await asyncio.to_thread(solve_dijkstra_route, start_loc, end_loc, "Shortest")
    base_dist = base_route.get("distance") or (db_trip.distance if db_trip.distance else 318.31)
    base_dur = base_route.get("duration") or (db_trip.eta_seconds if db_trip.eta_seconds else 19440)

    results = []
    for cfg in strategies_config:
        s_dist = round(base_dist * cfg["dist_mult"], 2)
        s_dur = int(base_dur * cfg["dur_mult"])
        s_hrs = round(s_dur / 3600.0, 1)
        is_selected = (cfg["id"].lower() == curr_strategy.lower()) or (cfg["id"] == "Shortest" and curr_strategy in ["Shortest", "Default", ""])
        results.append({
            "id": cfg["id"],
            "name": cfg["name"],
            "distance": s_dist,
            "duration": s_dur,
            "duration_hrs": f"{s_hrs} hrs",
            "delay": cfg["delay"],
            "delay_type": cfg["delay_type"],
            "is_selected": is_selected
        })

    return {
        "trip_id": str(db_trip.trip_id),
        "selected_strategy": db_trip.route_type or "Shortest",
        "strategies": results
    }

@router.post("/{trip_id}/select-strategy")
async def select_trip_strategy(
    trip_id: uuid.UUID,
    payload: dict = Body(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import asyncio
    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    user_role = current_user.role.value.upper() if hasattr(current_user.role, 'value') else str(current_user.role).upper()
    if user_role not in ["ADMIN", "FLEETMANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized: Route strategy selection is restricted to Fleet Managers and Administrators."
        )

    if (db_trip.status or "").upper() in ["COMPLETED", "DELIVERED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change route strategy on a completed trip."
        )

    new_strategy = payload.get("route_type") or payload.get("strategy") or "Fastest"
    db_trip.route_type = new_strategy
    
    # Recalculate route
    route_details = await asyncio.to_thread(solve_dijkstra_route, db_trip.start_location, db_trip.destination, new_strategy)
    if route_details.get("distance"):
        db_trip.distance = route_details["distance"]
        db_trip.eta_seconds = route_details["duration"]
    
    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)
    return {"status": "success", "trip_id": str(db_trip.trip_id), "route_type": db_trip.route_type, "distance": db_trip.distance, "duration": db_trip.eta_seconds}

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

    # Release linked shipment, driver, and vehicle status
    from app.models.shipment import Shipment
    from app.models.vehicle import Vehicle
    from app.models.driver import Driver
    if db_trip.shipment_id:
        shipment = db.query(Shipment).filter(Shipment.shipment_id == db_trip.shipment_id).first()
        if shipment:
            shipment.status = "Created"
            shipment.vehicle_id = None
            shipment.driver_id = None
            db.add(shipment)
    if db_trip.vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_trip.vehicle_id).first()
        if vehicle:
            vehicle.status = "Assigned" if vehicle.assigned_driver else "Available"
            db.add(vehicle)
    if db_trip.driver_id:
        driver = db.query(Driver).filter(Driver.driver_id == db_trip.driver_id).first()
        if driver:
            driver.status = "Available"
            db.add(driver)
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
            
        detailed_coords = downsample_coords(route_details["coords"], target_len=75)
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
                trip.vehicle.status = "Available"
                db.add(trip.vehicle)
            if trip.driver:
                trip.driver.status = "Available"
                db.add(trip.driver)
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
                "distance_remaining": 0.0 if is_arrived else round(route_details["distance"] * remaining_fraction, 1),
                "route_coords": [[c["lat"], c["lng"]] for c in route_details["coords"]]
            }]
        }
        
        if redis_pubsub_available and r_pubsub:
            r_pubsub.publish("telemetry_channel", json.dumps(payload))
        else:
            await manager.broadcast(payload)
            
    db.commit()
    return {"status": "success", "message": f"Simulated GPS ping for {len(active_trips)} active dispatches."}

@router.get("/{trip_id}/live-view")
async def get_trip_live_view(
    trip_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import asyncio
    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")
        
    route_type = db_trip.route_type or "Fastest"
    route_details = await asyncio.to_thread(solve_dijkstra_route, db_trip.start_location, db_trip.destination, route_type)
    
    # Determine position
    lat = db_trip.current_lat
    lng = db_trip.current_lng
    
    if route_details["coords"]:
        if db_trip.status in ["Completed", "Delivered"]:
            lat = route_details["coords"][-1]["lat"]
            lng = route_details["coords"][-1]["lng"]
        elif db_trip.status == "Scheduled":
            lat = route_details["coords"][0]["lat"]
            lng = route_details["coords"][0]["lng"]
        elif not lat or not lng or (route_details["coords"][0]["lat"] > 0 and lat < 0) or (route_details["coords"][0]["lng"] > 0 and lng < 0):
            lat = route_details["coords"][0]["lat"]
            lng = route_details["coords"][0]["lng"]
    elif not lat or not lng:
        lat = 0.0
        lng = 0.0
            
    license_plate = db_trip.vehicle.license_plate if db_trip.vehicle else "FF-MOCK"
    driver_name = db_trip.driver.user.full_name if (db_trip.driver and db_trip.driver.user) else "Operator"
    driver_id = str(db_trip.driver_id) if db_trip.driver_id else None
    
    route_coords = [[c["lat"], c["lng"]] for c in route_details["coords"]] if route_details["coords"] else []
    is_finished = db_trip.status in ["Completed", "Delivered"]
    
    return {
        "trip_id": str(db_trip.trip_id),
        "license_plate": license_plate,
        "driver_name": driver_name,
        "driver_id": driver_id,
        "lat": lat,
        "lng": lng,
        "status": db_trip.status,
        "eta_seconds": 0 if is_finished else db_trip.eta_seconds,
        "cargo": db_trip.cargo,
        "route_type": route_type,
        "distance_remaining": 0.0 if is_finished else round(db_trip.distance, 1),
        "route_coords": route_coords
    }

@router.post("/{trip_id}/review", response_model=TripOut)
def review_completed_trip(
    trip_id: uuid.UUID,
    payload: TripReviewCreate = Body(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_upper = current_user.role.value.upper() if hasattr(current_user.role, 'value') else str(current_user.role).upper()
    if role_upper not in ["ADMIN", "FLEETMANAGER", "DISPATCHER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Fleet Managers, Admins, or Dispatchers can review driver performance."
        )

    db_trip = get_trip(db, trip_id=trip_id)
    if not db_trip:
        raise HTTPException(status_code=404, detail="Trip record not found")

    if db_trip.status not in ["Completed", "Delivered"]:
        raise HTTPException(
            status_code=400,
            detail="Only completed trips can be reviewed."
        )

    rating = min(5.0, max(1.0, float(payload.rating)))
    db_trip.driver_rating = rating
    db_trip.driver_review = (payload.review or "").strip()
    db_trip.reviewed_by = current_user.full_name or current_user.email
    db_trip.reviewed_at = datetime.utcnow()

    db.add(db_trip)
    db.commit()
    db.refresh(db_trip)

    # In-App Notification for Driver and Management
    try:
        from app.routers.notifications import create_and_broadcast_notification
        d_name = db_trip.driver.user.full_name if (db_trip.driver and getattr(db_trip.driver, 'user', None)) else "Driver"
        if db_trip.driver and getattr(db_trip.driver, 'user_id', None):
            create_and_broadcast_notification(
                db=db,
                title="⭐ PERFORMANCE REVIEW RECEIVED",
                message=f"You received a {rating}★ rating for Trip: {db_trip.start_location} ➔ {db_trip.destination}.",
                type="general",
                user_id=db_trip.driver.user_id,
                target_role="Driver"
            )
        create_and_broadcast_notification(
            db=db,
            title="⭐ DRIVER REVIEW SUBMITTED",
            message=f"{d_name} was rated {rating}★ for trip from {db_trip.start_location} to {db_trip.destination}.",
            type="info",
            target_role="Dispatcher"
        )
    except Exception as e:
        print(f"[Review Notification Warning] {e}")

    return db_trip
