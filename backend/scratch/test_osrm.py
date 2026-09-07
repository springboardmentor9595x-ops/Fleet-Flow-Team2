import urllib.request
import urllib.parse
import json

def test_osrm():
    start_lat, start_lng = 16.3067, 80.4365
    end_lat, end_lng = 18.2949, 83.8938
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson&alternatives=true"
    print("Querying URL:", url)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FleetFlow/1.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode())
            print("Response Code:", res_data.get("code"))
            if "routes" in res_data:
                print("Number of routes:", len(res_data["routes"]))
                route = res_data["routes"][0]
                print("Geometry coords count:", len(route["geometry"]["coordinates"]))
                print("First few coords:", route["geometry"]["coordinates"][:5])
            else:
                print("No routes in response:", res_data)
    except Exception as e:
        print("Error during query:", e)

if __name__ == "__main__":
    test_osrm()
