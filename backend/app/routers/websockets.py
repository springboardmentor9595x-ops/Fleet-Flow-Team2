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
from app.routers.trips import notify_shipment_status_change

router = APIRouter()

# Try connecting to Redis for Pub/Sub
try:
    r_pubsub = redis.Redis(host='127.0.0.1', port=6379, db=0, socket_connect_timeout=1)
    r_pubsub.ping()
    redis_pubsub_available = True
    print("[WebSocket Engine] Redis Pub/Sub: ACTIVE")
except Exception:
    r_pubsub = None
    redis_pubsub_available = False
    print("[WebSocket Engine] Redis Pub/Sub: OFFLINE (falling back to memory broadcasting)")

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

def downsample_coords(coords: list[dict], target_len: int = 15) -> list[dict]:
    """
    Downsamples coordinates to a smaller size to make simulation pace pleasant.
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
            
            for trip in active_trips:
                trip_uuid = str(trip.trip_id)
                route_type = trip.route_type or "Fastest"
                
                # Fetch route sequence path (via OSRM/Nominatim engine)
                route_details = await asyncio.to_thread(solve_dijkstra_route, trip.start_location, trip.destination, route_type)
                if not route_details["coords"]:
                    continue

                detailed_coords = downsample_coords(route_details["coords"], target_len=15)
                total_steps = len(detailed_coords)

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
                        notify_shipment_status_change(trip.shipment, "Departed")

                # Retrieve next coordinates
                is_arrived = False
                if curr_step >= total_steps - 1:
                    is_arrived = True
                    coord = detailed_coords[-1]
                else:
                    next_step = curr_step + 1
                    SIMULATION_STEPS[trip_uuid] = next_step
                    coord = detailed_coords[next_step]
                    
                    # Geofence check to destination coordinates
                    dest_coord = detailed_coords[-1]
                    if check_geofence_arrival(coord["lat"], coord["lng"], dest_coord["lat"], dest_coord["lng"]):
                        is_arrived = True
                        coord = dest_coord

                # Simulated Route Deviation / Rerouting Alert
                if not is_arrived and curr_step > 2 and curr_step < total_steps - 3 and random.random() < 0.08:
                    alt_types = [t for t in ["Fastest", "Shortest", "Traffic Avoidance", "Fuel Efficient"] if t != route_type]
                    new_route_type = random.choice(alt_types)
                    trip.route_type = new_route_type
                    
                    # Recalculate route from current position to end location
                    current_pos_str = f"{coord['lat']},{coord['lng']}"
                    new_route = await asyncio.to_thread(solve_dijkstra_route, current_pos_str, trip.destination, new_route_type)
                    
                    if new_route and new_route.get("coords"):
                        detailed_coords = downsample_coords(new_route["coords"], target_len=12)
                        total_steps = len(detailed_coords)
                        curr_step = 0
                        SIMULATION_STEPS[trip_uuid] = 0
                        coord = detailed_coords[0]
                        route_details = new_route
                        route_type = new_route_type
                        
                        reroute_payload = {
                            "type": "REROUTE_EVENT",
                            "trip_id": trip_uuid,
                            "license_plate": license_plate,
                            "message": f"Route deviation detected for vehicle {license_plate}! Recalculating path to target using {new_route_type} route."
                        }
                        if redis_pubsub_available and r_pubsub:
                            r_pubsub.publish("telemetry_channel", json.dumps(reroute_payload))
                        else:
                            await manager.broadcast(reroute_payload)

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

                # Update database trip coordinates
                update_trip_coords(db, db_trip=trip, lat=coord["lat"], lng=coord["lng"], eta_seconds=eta_remaining)

                if is_arrived:
                    # 1. Update Trip Completed coordinates
                    trip.status = "Completed"
                    trip.end_time = datetime.utcnow()
                    db.add(trip)
                    
                    # 2. Update linked Shipment to Delivered
                    if trip.shipment_id:
                        shipment = db.query(Shipment).filter(Shipment.shipment_id == trip.shipment_id).first()
                        if shipment:
                            shipment.status = "Delivered"
                            db.add(shipment)
                            notify_shipment_status_change(shipment, "Completed")
                    
                    if trip.vehicle:
                        trip.vehicle.status = "Available"  # Force vehicle status to Available
                        db.add(trip.vehicle)
                        
                    if trip.driver:
                        trip.driver.status = "Available"  # Force driver status to Available
                        db.add(trip.driver)
                        
                    SIMULATION_STEPS.pop(trip_uuid, None)
                    print(f"[Geofencing Alert] Vehicle arrived at destination depot. Trip {trip_uuid} completed.")

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

                # Telemetry update payload
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

        # Telemetry update interval runs every 3 seconds
        await asyncio.sleep(3.0)

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
        initial_data = []
        for t in active_trips:
            route_details = await asyncio.to_thread(solve_dijkstra_route, t.start_location, t.destination, t.route_type or "Fastest")
            detailed_coords = downsample_coords(route_details["coords"], target_len=15)
            initial_data.append({
                "trip_id": str(t.trip_id),
                "license_plate": t.vehicle.license_plate if t.vehicle else "FF-MOCK",
                "driver_name": t.driver.user.full_name if (t.driver and t.driver.user) else "Operator",
                "lat": t.current_lat,
                "lng": t.current_lng,
                "status": t.status,
                "eta_seconds": t.eta_seconds,
                "cargo": t.cargo,
                "route_type": t.route_type,
                "distance_remaining": t.distance,
                "route_coords": [[c["lat"], c["lng"]] for c in detailed_coords]
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
