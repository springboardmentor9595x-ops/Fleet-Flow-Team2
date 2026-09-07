import urllib.request
import json
from datetime import date
from app.core.security import create_access_token
from app.database import SessionLocal
from app.models.user import User
from app.models.driver import Driver
from app.models.attendance import Attendance
from app.models.leave_request import LeaveRequest

BASE_URL = "http://127.0.0.1:8000"

def test_leave_flow():
    db = SessionLocal()
    try:
        # Find a driver with user account
        driver = db.query(Driver).filter(Driver.user_id.isnot(None)).first()
        if not driver:
            print("No driver with user account found.")
            return
        
        user = db.query(User).filter(User.user_id == driver.user_id).first()
        driver_token = create_access_token(data={"sub": user.email, "role": "Driver"})
        admin_token = create_access_token(data={"sub": "admin@fleetflow.com", "role": "Admin"})

        print(f"Testing with Driver: {driver.user.full_name} ({driver.user.email})")

        # 1. Driver Submits Leave Request for 2026-09-01 to 2026-09-02
        req_data = {
            "start_date": "2026-09-01",
            "end_date": "2026-09-02",
            "reason": "Attending family wedding ceremony in hometown"
        }
        req = urllib.request.Request(
            f"{BASE_URL}/attendance/leave/request",
            data=json.dumps(req_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {driver_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req) as resp:
            leave_res = json.loads(resp.read().decode())
            leave_id = leave_res["leave_id"]
            print(f"1. Leave request created successfully: ID {leave_id}, Status: {leave_res['status']}")

        # 2. Admin Lists All Pending Leaves
        req_admin = urllib.request.Request(
            f"{BASE_URL}/attendance/leave/all?status_filter=Pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        with urllib.request.urlopen(req_admin) as resp:
            leaves = json.loads(resp.read().decode())
            print(f"2. Admin retrieved pending leaves: {len(leaves)} pending request(s).")
            assert any(l["leave_id"] == leave_id for l in leaves)

        # 3. Admin Approves the Leave Request
        review_data = {
            "status": "Approved",
            "review_notes": "Approved. Safe travels!"
        }
        req_review = urllib.request.Request(
            f"{BASE_URL}/attendance/leave/{leave_id}/review",
            data=json.dumps(review_data).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {admin_token}",
                "Content-Type": "application/json"
            },
            method="PUT"
        )
        with urllib.request.urlopen(req_review) as resp:
            review_res = json.loads(resp.read().decode())
            print(f"3. Admin review completed: Status is now {review_res['status']}")
            assert review_res["status"] == "Approved"

        # 4. Verify Attendance records auto-created for 2026-09-01 and 2026-09-02
        req_fleet = urllib.request.Request(
            f"{BASE_URL}/attendance/fleet?target_date=2026-09-01",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        with urllib.request.urlopen(req_fleet) as resp:
            fleet_data = json.loads(resp.read().decode())
            driver_entry = next((d for d in fleet_data["drivers"] if d["driver_id"] == str(driver.driver_id)), None)
            print(f"4. Auto-Attendance for 2026-09-01: Status={driver_entry['status']}, Remarks={driver_entry['remarks']}")
            assert driver_entry["status"] == "Leave"

        print("\n>>> ALL LEAVE REQUEST & ATTENDANCE AUTO-MARKING TESTS PASSED! <<<")

    finally:
        db.close()

if __name__ == "__main__":
    test_leave_flow()
