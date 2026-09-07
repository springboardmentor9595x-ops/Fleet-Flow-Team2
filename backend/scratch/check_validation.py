import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.utils.routing import geocode_address

def test(address):
    res = geocode_address(address)
    print(f"Address: '{address}' -> Result: {res}")

print("Testing validation:")
test("Srikakulam")
test("Srikakulam, AP")
test("Kerala")
test("KERALA, INDIA")
test("asdfghjkl")
test("xyz_invalid_place_123")
