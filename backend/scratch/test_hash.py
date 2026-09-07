import hashlib

def get_coords(address):
    addr_upper = address.strip().upper()
    h = int(hashlib.md5(addr_upper.encode('utf-8')).hexdigest(), 16)
    lat = 15.0 + (h % 5000) / 1000.0
    lng = 78.0 + ((h // 5000) % 6000) / 1000.0
    print(f"Address: '{address}' -> Fallback Lat: {lat}, Fallback Lng: {lng}")

get_coords("KERALA")
get_coords("KERALA, INDIA")
