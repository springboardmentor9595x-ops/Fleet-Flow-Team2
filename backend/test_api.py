import urllib.request
import json

def test():
    try:
        # Query vehicles
        req = urllib.request.Request("http://127.0.0.1:8000/vehicles")
        with urllib.request.urlopen(req) as res:
            vehicles = json.loads(res.read().decode())
            print(f"API Vehicles: {len(vehicles)}")
            if vehicles:
                print(f" - Keys of first vehicle: {list(vehicles[0].keys())}")
                print(f" - First vehicle: {vehicles[0]}")
    except Exception as e:
        print(f"Failed to query vehicles API: {e}")

    try:
        # Query drivers
        req = urllib.request.Request("http://127.0.0.1:8000/drivers")
        with urllib.request.urlopen(req) as res:
            drivers = json.loads(res.read().decode())
            print(f"API Drivers: {len(drivers)}")
            if drivers:
                print(f" - Keys of first driver: {list(drivers[0].keys())}")
                print(f" - First driver: {drivers[0]}")
    except Exception as e:
        print(f"Failed to query drivers API: {e}")

if __name__ == "__main__":
    test()
