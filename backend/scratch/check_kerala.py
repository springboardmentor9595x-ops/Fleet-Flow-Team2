import urllib.request
import urllib.parse
import json

def test_geocode(address):
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(address)}&format=json&limit=5"
        req = urllib.request.Request(
            url, 
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data:
                for idx, result in enumerate(data):
                    print(f"[{idx}] Address: {address} -> Name: {result['display_name']} -> Lat: {result['lat']}, Lng: {result['lon']}")
            else:
                print(f"Address: {address} -> No results found")
    except Exception as e:
        print(f"Address: {address} -> Failed: {e}")

test_geocode("Srikakulam, India")
test_geocode("Kerala, India")
test_geocode("Kerala")
