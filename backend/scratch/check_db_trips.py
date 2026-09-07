import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.vehicle import Vehicle
from app.models.driver import Driver
from app.models.shipment import Shipment
from app.models.user import User
from app.models.trip import Trip

engine = create_engine("postgresql://postgres:1205@localhost:5432/fleetflow_db")
Session = sessionmaker(bind=engine)
db = Session()

trips = db.query(Trip).all()
for t in trips:
    print(f"Trip: {t.trip_id} | {t.start_location} -> {t.destination} | Status: {t.status}")
    print(f"  Start Lat/Lng: ({t.current_lat}, {t.current_lng})")
    # Let's get the solved route coordinates of this trip
    from app.utils.routing import solve_dijkstra_route
    try:
        route = solve_dijkstra_route(t.start_location, t.destination, t.route_type)
        if route and route.get("coords"):
            print(f"  Solved Start: {route['coords'][0]}")
            print(f"  Solved End: {route['coords'][-1]}")
            print(f"  Distance: {route['distance']} km")
        else:
            print("  Route solve failed")
    except Exception as e:
        print(f"  Route solve error: {e}")
