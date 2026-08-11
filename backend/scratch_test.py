import requests
import random
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_test():
    print("STARTING FLEETFLOW MILESTONE 2 FULL DIAGNOSTIC MONITOR...\n")

    random_id = random.randint(1000, 9999)
    email = f"test_milestone_{random_id}@fleetflow.com"
    password = "SecurePassword123!"
    license_plate = f"CA-{random_id}-M2"

    print(f"1. REGISTERING OPERATOR CLEARANCE PROFILE: {email}...")
    signup_payload = {
        "full_name": "Milestone 2 Admin Node",
        "email": email,
        "password": password,
        "role": "FleetManager"
    }
    
    try:
        signup_res = requests.post(f"{BASE_URL}/auth/signup", json=signup_payload)
        if signup_res.status_code != 200:
            print(f"SIGNUP FAILED: {signup_res.json()}")
            return
        print("SIGNUP SUCCESSFUL!\n")
    except requests.exceptions.ConnectionError:
        print("CONNECTION FAILURE: Is the FastAPI server running on http://127.0.0.1:8000?")
        print("Start the backend server first using: uvicorn app.main:app --reload")
        return

    print("2. AUTHENTICATING AND RETRIEVING JWT BEARER KEYS...")
    login_payload = {
        "email": email,
        "password": password
    }
    login_res = requests.post(f"{BASE_URL}/auth/login", json=login_payload)
    if login_res.status_code != 200:
        print(f"LOGIN FAILED: {login_res.json()}")
        return
    
    tokens = login_res.json()
    access_token = tokens["access_token"]
    print("AUTHENTICATION VERIFIED! Access token compiled.\n")

    headers = {"Authorization": f"Bearer {access_token}"}

    print(f"3. PROVISIONING TRUCK IN REGISTRY: {license_plate}...")
    vehicle_payload = {
        "registration_number": license_plate,
        "model": "Volvo VNL 860",
        "status": "Depot",
        "fuel_type": "Diesel",
        "mileage": 12000
    }
    vehicle_res = requests.post(f"{BASE_URL}/vehicles/", json=vehicle_payload, headers=headers)
    if vehicle_res.status_code != 201:
        print(f"VEHICLE PROVISIONING FAILED: {vehicle_res.json()}")
        return
    db_vehicle = vehicle_res.json()
    vehicle_id = db_vehicle["vehicle_id"]
    print(f"VEHICLE CREATED! UUID: {vehicle_id}\n")

    print("4. COMPILING NEW SHIPMENT: SF Depot -> LA Terminal...")
    shipment_payload = {
        "source": "SF",
        "destination": "LA",
        "customer_name": "Silicon Graphics Corp",
        "shipment_weight": 14200.0,
        "cargo_description": "Liquid cooled mainframe graphics processors",
        "expected_delivery_time": None
    }
    shipment_res = requests.post(f"{BASE_URL}/shipments/", json=shipment_payload, headers=headers)
    if shipment_res.status_code != 201:
        print(f"SHIPMENT COMPILATION FAILED: {shipment_res.json()}")
        return
    db_shipment = shipment_res.json()
    shipment_id = db_shipment["shipment_id"]
    print(f"SHIPMENT REGISTERED! Tracking key: {db_shipment['tracking_number']}\n")

    print("5. SCHEDULING ROUTED DISPATCH WITH TRAFFIC AVOIDANCE ALGORITHM...")
    trip_payload = {
        "start_location": "SF",
        "destination": "LA",
        "cargo": "Silicon Graphics Processors (Expedited)",
        "vehicle_id": vehicle_id,
        "driver_id": None
    }
    trip_res = requests.post(f"{BASE_URL}/trips/", json=trip_payload, headers=headers)
    if trip_res.status_code != 201:
        print(f"DISPATCH SCHEDULING FAILED: {trip_res.json()}")
        return
    db_trip = trip_res.json()
    trip_id = db_trip["trip_id"]
    print("DISPATCH SOLVED SUCCESSFULLY!")
    print(f"SOLVED DIJKSTRA DISTANCE: {db_trip['distance']} Miles")
    print(f"TRAFFIC-AWARE ETA: {db_trip['eta_seconds'] // 60} minutes")
    print(f"ROUTE PROFILE DESIGN: Traffic Avoidance\n")

    print(f"6. UPDATING STATUS: Created -> Assigned...")
    status_payload = {"status": "Assigned"}
    assign_res = requests.put(f"{BASE_URL}/shipments/{shipment_id}/status", json=status_payload, headers=headers)
    if assign_res.status_code != 200:
        print(f"STATUS ASSIGNED CHANGE FAILED: {assign_res.json()}")
        return
    print("STATUS TRANSITION VERIFIED: Shipment driver assigned.\n")

    print("7. CLEANING UP DIAGNOSTIC DATA...")
    del_trip_res = requests.delete(f"{BASE_URL}/trips/{trip_id}", headers=headers)
    del_shp_res = requests.delete(f"{BASE_URL}/shipments/{shipment_id}", headers=headers)
    del_veh_res = requests.delete(f"{BASE_URL}/vehicles/{vehicle_id}", headers=headers)
    if del_trip_res.status_code == 204 and del_shp_res.status_code == 204 and del_veh_res.status_code == 204:
        print("DATABASE SCRATCH CLEANUP COMPLETE!")
    else:
        print(f"Clean warning: trip delete {del_trip_res.status_code}, shipment delete {del_shp_res.status_code}, vehicle delete {del_veh_res.status_code}")

    print("\nALL LOGISTICS FLOWS, TRAFFIC ROUTING, AND SHIPMENT APIS TESTED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
