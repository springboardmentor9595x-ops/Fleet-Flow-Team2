import urllib.request
import json
import urllib.parse

BASE_URL = "http://127.0.0.1:8000"

from app.core.security import create_access_token

def run_tests():
    print("--- 1. Generating Admin Token ---")
    token = create_access_token(data={"sub": "admin@fleetflow.com", "role": "Admin"})
    print("Admin Token acquired.")

    auth_headers = {"Authorization": f"Bearer {token}"}

    print("\n--- 2. Testing Notifications Endpoint ---")
    req = urllib.request.Request(f"{BASE_URL}/notifications/", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        notifs = json.loads(resp.read().decode())
        print(f"Notifications listed: {len(notifs)} records found.")

    print("\n--- 3. Testing Attendance Endpoints ---")
    req = urllib.request.Request(f"{BASE_URL}/attendance/fleet", headers=auth_headers)
    with urllib.request.urlopen(req) as resp:
        att = json.loads(resp.read().decode())
        print(f"Fleet attendance retrieved: {att['summary']['total_drivers']} drivers, present: {att['summary']['present']}.")

    print("\n--- 4. Testing Reports Endpoints ---")
    report_endpoints = [
        "fleet-utilization",
        "fuel-consumption",
        "driver-performance",
        "delivery-performance",
        "maintenance"
    ]
    for rep in report_endpoints:
        # JSON Preview
        req = urllib.request.Request(f"{BASE_URL}/reports/{rep}", headers=auth_headers)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
            print(f"Report [{rep}] Preview OK -> Title: {data.get('title')}, KPIs: {list(data.get('kpis', {}).keys())}")

        # PDF Export
        req_pdf = urllib.request.Request(f"{BASE_URL}/reports/{rep}/export/pdf", headers=auth_headers)
        with urllib.request.urlopen(req_pdf) as resp_pdf:
            pdf_bytes = resp_pdf.read()
            print(f"Report [{rep}] PDF Export OK -> {len(pdf_bytes)} bytes.")
            if rep == "delivery-performance":
                with open("delivery_performance_test.pdf", "wb") as f:
                    f.write(pdf_bytes)
                print("Saved delivery_performance_test.pdf for inspection.")

        # Excel Export
        req_xls = urllib.request.Request(f"{BASE_URL}/reports/{rep}/export/excel", headers=auth_headers)
        with urllib.request.urlopen(req_xls) as resp_xls:
            xls_bytes = resp_xls.read()
            print(f"Report [{rep}] Excel Export OK -> {len(xls_bytes)} bytes.")

    print("\n>>> ALL MILESTONE 4 BACKEND ENDPOINTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
