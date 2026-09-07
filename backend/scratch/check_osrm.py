import urllib.request
import json

def check_osrm(start_lat, start_lng, end_lat, end_lng):
    try:
        url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=full&geometries=geojson&alternatives=true"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"})
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode())
            if res_data.get("code") == "Ok" and res_data.get("routes"):
                for idx, route in enumerate(res_data["routes"]):
                    coords = route["geometry"]["coordinates"]
                    print(f"[{idx}] OSRM Success! Points: {len(coords)}")
                    print(f"    Start: {coords[0]}")
                    print(f"    End: {coords[-1]}")
            else:
                print(f"OSRM Error: {res_data}")
    except Exception as e:
        print(f"OSRM Failed: {e}")

check_osrm(18.2949, 83.8938, 10.3528, 76.5120)
