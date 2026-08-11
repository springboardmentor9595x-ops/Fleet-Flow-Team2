import requests

def test_create_driver():
    # 1. Create a FleetManager account first
    signup_url = "http://127.0.0.1:8000/auth/signup"
    signup_payload = {
        "full_name": "Test Manager",
        "email": "testmanager@example.com",
        "password": "Password123!",
        "phone": "9999999998",
        "role": "FleetManager"
    }
    
    try:
        signup_res = requests.post(signup_url, json=signup_payload)
        print("Signup Status:", signup_res.status_code)
        
        # 2. Login as the FleetManager
        login_url = "http://127.0.0.1:8000/auth/login"
        login_payload = {
            "email": "testmanager@example.com",
            "password": "Password123!"
        }
        
        login_res = requests.post(login_url, json=login_payload)
        print("Login Status:", login_res.status_code)
        if login_res.status_code != 200:
            print("Login failed, aborting test.")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Create a driver
        driver_url = "http://127.0.0.1:8000/drivers/"
        driver_payload = {
            "full_name": "Seeded Test Driver",
            "email": "testdriver@example.com",
            "password": "Password123!",
            "phone": "9876543210",
            "license_number": "DL-12345678",
            "experience_years": 5,
            "address": "Hyderabad, India",
            "status": "Active"
        }
        
        driver_res = requests.post(driver_url, json=driver_payload, headers=headers)
        print("Driver Creation Status:", driver_res.status_code)
        print("Driver Creation JSON:", driver_res.json())
        
    except Exception as e:
        print("Test failed:", e)

if __name__ == "__main__":
    test_create_driver()
