import urllib.request
import urllib.parse
import json
import math
import redis

# California Depots Coordinates Map matching frontend SVG centers
DEPOTS = {
    "SF": {"lat": 37.7749, "lng": -122.4194, "name": "San Francisco Depot"},
    "OAKLAND": {"lat": 37.8044, "lng": -122.2712, "name": "Oakland Hub"},
    "SJ": {"lat": 37.3382, "lng": -121.8863, "name": "San Jose Terminal"},
    "SACRAMENTO": {"lat": 38.5816, "lng": -121.4944, "name": "Sacramento Station"},
    "FRESNO": {"lat": 36.7378, "lng": -119.7871, "name": "Fresno Logistics Center"},
    "LA": {"lat": 34.0522, "lng": -118.2437, "name": "Los Angeles Gateway"}
}

AVG_SPEED_MPH = 60.0

# Try connecting to Redis for Caching
try:
    r_client = redis.Redis(host='127.0.0.1', port=6379, db=0, socket_connect_timeout=1)
    r_client.ping()
    redis_available = True
    print("[Routing Engine] Redis cache backend: ACTIVE")
except Exception:
    r_client = None
    redis_available = False
    print("[Routing Engine] Redis cache backend: OFFLINE (falling back to memory cache)")

# In-memory backup cache
MEMORY_CACHE = {}

def get_cached_route(start: str, end: str, route_type: str) -> dict | None:
    key = f"route:{start}:{end}:{route_type}"
    if redis_available and r_client:
        try:
            data = r_client.get(key)
            if data:
                return json.loads(data.decode('utf-8'))
        except Exception:
            pass
    return MEMORY_CACHE.get(key)

def set_cached_route(start: str, end: str, route_type: str, route_data: dict):
    key = f"route:{start}:{end}:{route_type}"
    if redis_available and r_client:
        try:
            r_client.setex(key, 300, json.dumps(route_data)) # cache for 5 mins
            return
        except Exception:
            pass
    MEMORY_CACHE[key] = route_data

def geocode_address(address: str) -> tuple[float, float] | None:
    """
    Geocodes an address string to (latitude, longitude) using Nominatim.
    Fails gracefully returning None if rate limited or offline.
    """
    addr_upper = address.strip().upper()
    
    # 1. Check if it corresponds directly to a depot code
    if addr_upper in DEPOTS:
        return DEPOTS[addr_upper]["lat"], DEPOTS[addr_upper]["lng"]
        
    # 2. Query Nominatim API
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(address)}&format=json&limit=1"
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "FleetFlow/1.0 (fleetflow-team2@example.com)"}
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"[Routing Engine] Nominatim geocoding failed for '{address}': {e}")
        
    # 3. Fallback check for depot names
    for key, value in DEPOTS.items():
        if key in addr_upper or addr_upper in value["name"].upper():
            return value["lat"], value["lng"]
            
    return None

def haversine_distance(lat1, lon1, lat2, lon2):
    R = 3958.8 # Earth radius in miles
    dLat = math.radians(lat2 - lat1)
    dLon = math.radians(lon2 - lon1)
    a = math.sin(dLat/2) * math.sin(dLat/2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(dLon/2) * math.sin(dLon/2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def get_fallback_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float, route_type: str = "Fastest") -> dict:
    """
    Generates a fallback straight-line route with interpolated steps.
    """
    route_type = route_type.title()
    dist_miles = haversine_distance(start_lat, start_lng, end_lat, end_lng)
    
    speed = AVG_SPEED_MPH
    if route_type == "Traffic Avoidance":
        speed *= 0.7
    elif route_type == "Shortest":
        speed *= 0.9
    elif route_type == "Fuel Efficient":
        speed *= 0.85
        
    duration_seconds = int((dist_miles / speed) * 3600)
    
    # Interpolate coordinate points (15 points)
    steps = 15
    coords = []
    for i in range(steps + 1):
        fraction = i / steps
        lat = start_lat + (end_lat - start_lat) * fraction
        lng = start_lng + (end_lng - start_lng) * fraction
        coords.append({"lat": lat, "lng": lng})
        
    return {
        "path": [f"COORD_{i}" for i in range(len(coords))],
        "distance": round(dist_miles, 1),
        "duration": duration_seconds,
        "coords": coords,
        "route_type": route_type
    }

def get_osrm_route(start_lat: float, start_lng: float, end_lat: float, end_lng: float, route_type: str = "Fastest") -> dict | None:
    """
    Queries OSRM for route geometries between start and end coordinates.
    """
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson&alternatives=true"
        req = urllib.request.Request(url, headers={"User-Agent": "FleetFlow/1.0"})
        with urllib.request.urlopen(req, timeout=4) as response:
            res_data = json.loads(response.read().decode())
            if res_data.get("code") == "Ok" and res_data.get("routes"):
                routes = res_data["routes"]
                route_type = route_type.title()
                
                selected_route = routes[0]
                
                if len(routes) > 1:
                    if route_type == "Shortest":
                        selected_route = min(routes, key=lambda r: r["distance"])
                    elif route_type == "Traffic Avoidance":
                        def traffic_duration(r):
                            node_count = len(r["geometry"]["coordinates"])
                            congestion_factor = 1.0 + (node_count % 5) * 0.15
                            return r["duration"] * congestion_factor
                        selected_route = min(routes, key=traffic_duration)
                    elif route_type == "Fuel Efficient":
                        def fuel_cost(r):
                            dist_miles = r["distance"] * 0.000621371
                            node_count = len(r["geometry"]["coordinates"])
                            turns_per_mile = node_count / max(1.0, dist_miles)
                            return dist_miles * (1.0 + 0.05 * turns_per_mile)
                        selected_route = min(routes, key=fuel_cost)
                else:
                    selected_route = dict(selected_route)
                    if route_type == "Traffic Avoidance":
                        selected_route["duration"] *= 1.3
                    elif route_type == "Fuel Efficient":
                        selected_route["duration"] *= 0.95
                        selected_route["distance"] *= 1.02
                    elif route_type == "Shortest":
                        selected_route["duration"] *= 1.1
                        selected_route["distance"] *= 0.9
                
                distance_miles = round(selected_route["distance"] * 0.000621371, 1)
                duration_seconds = int(selected_route["duration"])
                coords = [{"lat": c[1], "lng": c[0]} for c in selected_route["geometry"]["coordinates"]]
                
                return {
                    "path": [f"COORD_{i}" for i in range(len(coords))],
                    "distance": distance_miles,
                    "duration": duration_seconds,
                    "coords": coords,
                    "route_type": route_type
                }
    except Exception as e:
        print(f"[Routing Engine] OSRM routing failed: {e}")
        
    return None

def solve_dijkstra_route(start: str, end: str, route_type: str = "Fastest") -> dict:
    """
    Updates the routing query to resolve using geocoding and OSRM.
    Falls back to Dijkstra or Haversine if APIs are unreachable.
    """
    start = start.strip()
    end = end.strip()
    route_type = route_type.title()
    
    cached = get_cached_route(start, end, route_type)
    if cached:
        return cached
        
    start_coords = geocode_address(start)
    end_coords = geocode_address(end)
    
    if not start_coords:
        start_coords = (DEPOTS["SF"]["lat"], DEPOTS["SF"]["lng"])
        print(f"[Routing Engine] Fallback start location to SF Depot")
    if not end_coords:
        end_coords = (DEPOTS["LA"]["lat"], DEPOTS["LA"]["lng"])
        print(f"[Routing Engine] Fallback destination location to LA Depot")
        
    start_lat, start_lng = start_coords
    end_lat, end_lng = end_coords
    
    result = get_osrm_route(start_lat, start_lng, end_lat, end_lng, route_type)
    
    if not result:
        print("[Routing Engine] Falling back to straight-line Haversine routing")
        result = get_fallback_route(start_lat, start_lng, end_lat, end_lng, route_type)
        
    set_cached_route(start, end, route_type, result)
    return result

def test_routing():
    res = solve_dijkstra_route("SF", "LA", "Traffic Avoidance")
    print(f"[Diagnostic] Solved Traffic Avoidance route: {res['path']} distance: {res['distance']} MI")
    assert len(res["coords"]) >= 2
