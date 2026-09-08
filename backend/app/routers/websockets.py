import asyncio
import uuid
import json
import redis
import random
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.crud.trip import get_trips, update_trip_coords, update_trip_status
from app.models.trip import Trip
from app.models.shipment import Shipment
from app.models.gps_tracking import GPSTracking
from app.utils.routing import solve_dijkstra_route, DEPOTS
from app.routers.trips import notify_shipment_status_change, notify_trip_cargo_status_change
from app.config import settings

router = APIRouter()

# Try connecting to Redis for Pub/Sub
try:
    r_pubsub = redis.from_url(settings.redis_url, socket_connect_timeout=2)
    r_pubsub.ping()
    redis_pubsub_available = True
    print("[WebSocket Engine] Redis Pub/Sub: ACTIVE")
except Exception as re:
    r_pubsub = None
    redis_pubsub_available = False
    print(f"[WebSocket Engine] Redis Pub/Sub: OFFLINE (falling back to memory broadcasting) - {re}")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"[WebSocket] Client connected. Active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        print(f"[WebSocket] Client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

manager = ConnectionManager()

# In-memory tracking of simulation steps: { trip_id: current_step }
SIMULATION_STEPS = {}
MILESTONES_SENT = {}

def get_nearest_intermediate_city(lat: float, lng: float, start_loc: str, dest_loc: str) -> str:
    from app.utils.routing import INDIAN_LOCATIONS, DEPOTS
    import math
    
    start_upper = start_loc.upper()
    dest_upper = dest_loc.upper()
    
    candidates = {}
    for name, coords in INDIAN_LOCATIONS.items():
        if name not in start_upper and name not in dest_upper:
            candidates[name] = coords
    for code, data in DEPOTS.items():
        name = data.get("name", code).upper()
        if code not in start_upper and code not in dest_upper:
            candidates[name] = (data["lat"], data["lng"])
            
    best_city = "Intermediate Hub"
    min_dist = float("inf")
    for name, (clat, clng) in candidates.items():
        d = math.hypot(lat - clat, lng - clng)
        if d < min_dist:
            min_dist = d
            best_city = name
    return best_city

def downsample_coords(coords: list[dict], target_len: int = 75) -> list[dict]:
    """
    Downsamples coordinates to a detailed path (~75 steps for ~3 minute real-time tracking).
    """
    if len(coords) <= target_len:
        return coords
    step = len(coords) / target_len
    return [coords[int(i * step)] for i in range(target_len - 1)] + [coords[-1]]

def check_geofence_arrival(current_lat: float, current_lng: float, target_lat: float, target_lng: float) -> bool:
    """
    Geofence Check: returns True if vehicle is within ~0.005 degrees (~0.3 miles)
    of the target destination coordinates.
    """
    diff_lat = abs(current_lat - target_lat)
    diff_lng = abs(current_lng - target_lng)
    return diff_lat < 0.005 and diff_lng < 0.005

async def run_telemetry_simulation():
    """
    Background simulation loop: moves In-Transit trucks, updates GPS positions
    in DB, runs geofence diagnostics, and broadcasts telemetry payload.
    """
    while True:
        db: Session = SessionLocal()
        try:
            active_trips = db.query(Trip).filter(Trip.status == "In Transit").all()
            
            payload_trips = []
            for trip in active_trips:
                trip_uuid = str(trip.trip_id)
                route_type = trip.route_type or "Fastest"
                
                # Fetch route sequence path (via OSRM/Nominatim engine)
                route_details = await asyncio.to_thread(solve_dijkstra_route, trip.start_location, trip.destination, route_type)
                if not route_details["coords"]:
                    continue

                full_coords = route_details["coords"]
                total_steps = len(full_coords)

                curr_step = SIMULATION_STEPS.get(trip_uuid, 0)
                license_plate = trip.vehicle.license_plate if trip.vehicle else "FF-MOCK"
                driver_name = trip.driver.user.full_name if (trip.driver and trip.driver.user) else "Operator"

                # 1. Geofence Departure (Exit) Alert
                if curr_step == 0:
                    event_payload = {
                        "type": "GEOFENCE_EVENT",
                        "trip_id": trip_uuid,
                        "license_plate": license_plate,
                        "event": "EXIT",
                        "zone": trip.start_location,
                        "message": f"Vehicle {license_plate} has departed from {trip.start_location}."
                    }
                    if redis_pubsub_available and r_pubsub:
                        r_pubsub.publish("telemetry_channel", json.dumps(event_payload))
                    else:
                        await manager.broadcast(event_payload)
                    
                    if trip.shipment:
                        notify_shipment_status_change(trip.shipment, "Departed", driver_name=driver_name, vehicle_plate=license_plate, stage="departed")
                    else:
                        notify_trip_cargo_status_change(trip, "Departed", driver_name=driver_name, vehicle_plate=license_plate, stage="departed")

                # Retrieve next coordinates - smoothly step along real road coordinates (e.g. 4 points per ping)
                is_arrived = False
                if curr_step >= total_steps - 1:
                    is_arrived = True
                    coord = full_coords[-1]
                else:
                    next_step = min(curr_step + 4, total_steps - 1)
                    SIMULATION_STEPS[trip_uuid] = next_step
                    coord = full_coords[next_step]
                    if next_step >= total_steps - 1:
                        is_arrived = True

# Random deviation removed so vehicle moves strictly on the path

                # Save coordinate log record to gps_tracking
                gps_log = GPSTracking(
                    vehicle_id=trip.vehicle_id,
                    latitude=coord["lat"],
                    longitude=coord["lng"],
                    speed=62.5 if not is_arrived else 0.0,
                    recorded_time=datetime.utcnow()
                )
                db.add(gps_log)

                # ETA calculations
                remaining_fraction = 1.0 - (curr_step / max(1, total_steps - 1))
                eta_remaining = int(route_details["duration"] * remaining_fraction) if not is_arrived else 0
                dist_rem = 0.0 if is_arrived else round(route_details["distance"] * remaining_fraction, 1)
                
                eta_str = f"{eta_remaining // 60} min" if eta_remaining < 3600 else f"{eta_remaining // 3600}h {(eta_remaining % 3600) // 60}m"

                # 2. En-Route Intermediate Checkpoint / Milestone Email Alert (~50% progress)
                if 0.40 <= remaining_fraction <= 0.60 and not is_arrived and "checkpoint" not in MILESTONES_SENT.get(trip_uuid, set()):
                    MILESTONES_SENT.setdefault(trip_uuid, set()).add("checkpoint")
                    near_city = get_nearest_intermediate_city(coord["lat"], coord["lng"], trip.start_location, trip.destination)
                    if trip.shipment:
                        notify_shipment_status_change(
                            trip.shipment,
                            status="In Transit",
                            driver_name=driver_name,
                            vehicle_plate=license_plate,
                            checkpoint_city=near_city,
                            distance_remaining=dist_rem,
                            eta_str=eta_str,
                            stage="checkpoint"
                        )
                    else:
                        notify_trip_cargo_status_change(
                            trip,
                            status="In Transit",
                            driver_name=driver_name,
                            vehicle_plate=license_plate,
                            checkpoint_city=near_city,
                            distance_remaining=dist_rem,
                            eta_str=eta_str,
                            stage="checkpoint"
                        )
                    m_payload = {
                        "type": "MILESTONE_EVENT",
                        "trip_id": trip_uuid,
                        "license_plate": license_plate,
                        "city": near_city,
                        "distance_remaining": dist_rem,
                        "eta_str": eta_str,
                        "message": f"Vehicle {license_plate} is now near {near_city}! Approaching {trip.destination} in {eta_str} ({dist_rem} km remaining)."
                    }
                    if redis_pubsub_available and r_pubsub:
                        r_pubsub.publish("telemetry_channel", json.dumps(m_payload))
                    else:
                        await manager.broadcast(m_payload)

                # 3. 2km Geofence Proximity / Out for Delivery Alert
                if (dist_rem <= 2.0 or curr_step >= total_steps - 3) and not is_arrived and "proximity_2km" not in MILESTONES_SENT.get(trip_uuid, set()):
                    MILESTONES_SENT.setdefault(trip_uuid, set()).add("proximity_2km")
                    if trip.shipment:
                        notify_shipment_status_change(
                            trip.shipment,
                            status="In Transit",
                            driver_name=driver_name,
                            vehicle_plate=license_plate,
                            distance_remaining=dist_rem,
                            eta_str=eta_str,
                            stage="proximity_2km"
                        )
                    else:
                        notify_trip_cargo_status_change(
                            trip,
                            status="In Transit",
                            driver_name=driver_name,
                            vehicle_plate=license_plate,
                            distance_remaining=dist_rem,
                            eta_str=eta_str,
                            stage="proximity_2km"
                        )
                    prox_payload = {
                        "type": "PROXIMITY_EVENT",
                        "trip_id": trip_uuid,
                        "license_plate": license_plate,
                        "destination": trip.destination,
                        "distance_remaining": dist_rem,
                        "eta_str": eta_str,
                        "message": f"OUT FOR DELIVERY: Vehicle {license_plate} is within 2 km of {trip.destination}! Arriving in ~{eta_str}."
                    }
                    if redis_pubsub_available and r_pubsub:
                        r_pubsub.publish("telemetry_channel", json.dumps(prox_payload))
                    else:
                        await manager.broadcast(prox_payload)

                # Update database trip coordinates
                update_trip_coords(db, db_trip=trip, lat=coord["lat"], lng=coord["lng"], eta_seconds=eta_remaining)

                if is_arrived:
                    # 1. Update Trip Completed coordinates
                    trip.status = "Completed"
                    trip.end_time = datetime.utcnow()
                    db.add(trip)
                    
                    # 2. Update linked Shipment to Delivered
                    tracking_num = trip.cargo
                    if trip.shipment_id:
                        shipment = db.query(Shipment).filter(Shipment.shipment_id == trip.shipment_id).first()
                        if shipment:
                            shipment.status = "Delivered"
                            tracking_num = shipment.tracking_number
                            db.add(shipment)
                            notify_shipment_status_change(shipment, "Completed", driver_name=driver_name, vehicle_plate=license_plate, stage="completed")
                    else:
                        notify_trip_cargo_status_change(trip, "Completed", driver_name=driver_name, vehicle_plate=license_plate, stage="completed")
                    
                    if trip.vehicle:
                        trip.vehicle.status = "Available"  # Force vehicle status to Available
                        db.add(trip.vehicle)
                        
                    if trip.driver:
                        trip.driver.status = "Available"  # Force driver status to Available
                        db.add(trip.driver)
                        
                    SIMULATION_STEPS.pop(trip_uuid, None)
                    print(f"[Geofencing Alert] Vehicle arrived at destination depot. Trip {trip_uuid} completed.")

                    # In-App Notification Dispatch for Stakeholders & Driver
                    try:
                        from app.routers.notifications import create_and_broadcast_notification
                        
                        # 1. Notify Fleet Managers & Admins
                        create_and_broadcast_notification(
                            db=db,
                            title="🎉 SHIPMENT DELIVERED",
                            message=f"Shipment #{tracking_num} (Vehicle {license_plate}) has arrived at destination {trip.destination} and is marked DELIVERED.",
                            type="success",
                            target_role="FleetManager",
                            broadcast_ws=True
                        )

                        # 2. Notify Dispatchers
                        create_and_broadcast_notification(
                            db=db,
                            title="🎉 SHIPMENT DELIVERED",
                            message=f"Shipment #{tracking_num} (Vehicle {license_plate}) has arrived at destination {trip.destination} and is marked DELIVERED.",
                            type="success",
                            target_role="Dispatcher",
                            broadcast_ws=True
                        )

                        # 3. Notify Driver
                        if trip.driver and getattr(trip.driver, 'user', None):
                            create_and_broadcast_notification(
                                db=db,
                                title="🎉 TRIP DELIVERED & COMPLETED",
                                message=f"You have arrived at {trip.destination}. Shipment #{tracking_num} marked as DELIVERED.",
                                type="success",
                                user_id=trip.driver.user.user_id,
                                target_role="Driver",
                                broadcast_ws=True
                            )
                    except Exception as ne:
                        print(f"[Delivery Notification Error] {ne}")

                    # Geofence Arrival (Enter) Alert
                    event_payload = {
                        "type": "GEOFENCE_EVENT",
                        "trip_id": trip_uuid,
                        "license_plate": license_plate,
                        "event": "ENTER",
                        "zone": trip.destination,
                        "message": f"Vehicle {license_plate} has arrived at destination: {trip.destination}."
                    }
                    if redis_pubsub_available and r_pubsub:
                        r_pubsub.publish("telemetry_channel", json.dumps(event_payload))
                    else:
                        await manager.broadcast(event_payload)

                db.commit()

                payload_trips.append({
                    "trip_id": trip_uuid,
                    "license_plate": license_plate,
                    "driver_name": driver_name,
                    "driver_id": str(trip.driver_id) if trip.driver_id else None,
                    "lat": coord["lat"],
                    "lng": coord["lng"],
                    "status": trip.status,
                    "eta_seconds": eta_remaining,
                    "cargo": trip.cargo,
                    "route_type": route_type,
                    "distance_remaining": 0.0 if is_arrived else round(route_details["distance"] * remaining_fraction, 1),
                    "route_coords": [[c["lat"], c["lng"]] for c in route_details["coords"]]
                })

            if payload_trips:
                payload = {
                    "type": "TELEMETRY_UPDATE",
                    "active_trips": payload_trips
                }
                # Publish telemetry to Redis Pub/Sub or fall back to memory broadcast
                if redis_pubsub_available and r_pubsub:
                    try:
                        r_pubsub.publish("telemetry_channel", json.dumps(payload))
                    except Exception:
                        await manager.broadcast(payload)
                else:
                    await manager.broadcast(payload)

        except Exception as e:
            print(f"[WebSocket Loop Error] {e}")
        finally:
            db.close()

        # Telemetry update interval runs every 2.5 seconds (~3 minute total trip duration)
        await asyncio.sleep(2.5)

async def redis_listener():
    """
    Subscribes to Redis Pub/Sub channel and broadcasts to all locally connected sockets.
    """
    if not redis_pubsub_available or not r_pubsub:
        return
        
    try:
        pubsub = r_pubsub.pubsub()
        pubsub.subscribe("telemetry_channel")
        print("[WebSocket Engine] Redis Pub/Sub listener subscribed.")
        
        while True:
            try:
                msg = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if msg:
                    data = json.loads(msg['data'].decode('utf-8'))
                    await manager.broadcast(data)
            except Exception:
                pass
            await asyncio.sleep(0.1)
    except Exception as e:
        print(f"[WebSocket Redis Listener Failed] {e}")

@router.websocket("/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    db: Session = SessionLocal()
    try:
        active_trips = db.query(Trip).filter(Trip.status == "In Transit").all()
        if not active_trips:
            latest = db.query(Trip).order_by(Trip.created_at.desc()).first()
            if latest:
                active_trips = [latest]

        initial_data = []
        for t in active_trips:
            route_details = await asyncio.to_thread(solve_dijkstra_route, t.start_location, t.destination, t.route_type or "Fastest")
            coords_list = route_details.get("coords", [])
            
            # Position truck at destination if Completed/Delivered, or origin if Scheduled
            lat_val = t.current_lat
            lng_val = t.current_lng
            is_trip_finished = t.status in ["Completed", "Delivered"]
            
            if is_trip_finished and coords_list:
                lat_val = coords_list[-1]["lat"]
                lng_val = coords_list[-1]["lng"]
            elif t.status == "Scheduled" and coords_list:
                lat_val = coords_list[0]["lat"]
                lng_val = coords_list[0]["lng"]
            elif not lat_val or not lng_val:
                if coords_list:
                    lat_val = coords_list[0]["lat"]
                    lng_val = coords_list[0]["lng"]

            initial_data.append({
                "trip_id": str(t.trip_id),
                "license_plate": t.vehicle.license_plate if t.vehicle else "FF-MOCK",
                "driver_name": t.driver.user.full_name if (t.driver and t.driver.user) else "Operator",
                "driver_id": str(t.driver_id) if t.driver_id else None,
                "lat": lat_val,
                "lng": lng_val,
                "status": t.status,
                "eta_seconds": 0 if is_trip_finished else t.eta_seconds,
                "cargo": t.cargo,
                "route_type": t.route_type,
                "distance_remaining": 0.0 if is_trip_finished else t.distance,
                "route_coords": [[c["lat"], c["lng"]] for c in coords_list]
            })
        await websocket.send_json({
            "type": "INITIAL_STATE",
            "active_trips": initial_data
        })
    except Exception as e:
        print(f"[WebSocket Initial Send Error] {e}")
    finally:
        db.close()

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
