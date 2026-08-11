import requests

def test_signup():
    url = "http://127.0.0.1:8000/auth/signup"
    payload = {
        "full_name": "Test User",
        "email": "testuser@example.com",
        "password": "Password123!",
        "phone": "9999999999",
        "role": "Driver"
    }
    
    try:
        response = requests.post(url, json=payload)
        print("Status Code:", response.status_code)
        print("Response JSON:", response.json())
    except Exception as e:
        print("Request failed:", e)

if __name__ == "__main__":
    test_signup()
