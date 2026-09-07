import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.user import User, RoleEnum
from app.routers.analytics import (
    get_fleet_dashboard_metrics,
    get_logistics_dashboard_metrics,
    get_admin_dashboard_metrics,
    get_driver_personal_dashboard
)

def test_analytics_endpoints():
    db = SessionLocal()
    try:
        # Find or create admin user for testing
        admin_user = db.query(User).filter(User.role == RoleEnum.Admin).first()
        if not admin_user:
            admin_user = User(email="testadmin@fleetflow.com", role=RoleEnum.Admin, full_name="Admin Test")

        # Find or create manager user
        manager_user = db.query(User).filter(User.role == RoleEnum.FleetManager).first()
        if not manager_user:
            manager_user = User(email="testmgr@fleetflow.com", role=RoleEnum.FleetManager, full_name="Manager Test")

        # Find or create driver user
        driver_user = db.query(User).filter(User.role == RoleEnum.Driver).first()
        if not driver_user:
            driver_user = User(email="testdriver@fleetflow.com", role=RoleEnum.Driver, full_name="Driver Test")

        print("\n--- 1. Testing Fleet Dashboard ---")
        fleet_res = get_fleet_dashboard_metrics(db=db, current_user=admin_user)
        print("Fleet Summary:", fleet_res["summary"])
        print("Vehicle Types:", fleet_res["vehicle_type_breakdown"])
        print("Fuel Summary:", fleet_res["fuel_summary"]["avg_fuel_efficiency_kml"], "km/L")
        print("Maintenance Alerts:", fleet_res["maintenance_alerts"]["upcoming_count"], "upcoming")

        print("\n--- 2. Testing Logistics Dashboard ---")
        logistics_res = get_logistics_dashboard_metrics(db=db, current_user=admin_user)
        print("Logistics Summary:", logistics_res["summary"])
        print("Status Breakdown:", logistics_res["delivery_status_breakdown"])
        print("Map Snapshot Points:", len(logistics_res["live_tracking_snapshot"]))

        print("\n--- 3. Testing Admin Dashboard ---")
        admin_res = get_admin_dashboard_metrics(db=db, current_user=admin_user)
        print("System KPIs:", admin_res["system_kpis"])
        print("Driver Leaderboard Count:", len(admin_res["driver_leaderboard"]))
        print("Celery Health:", admin_res["system_monitoring"]["celery_health"])

        print("\n--- 4. Testing Driver's Personal Dashboard ---")
        driver_res = get_driver_personal_dashboard(db=db, current_user=driver_user)
        print("Driver Info:", driver_res["driver_info"]["name"])
        print("Current Assignment:", driver_res["current_assignment"])
        print("Attendance Summary:", driver_res["attendance_summary"])

        print("\n✅ ALL 4 DASHBOARD ANALYTICS ENDPOINTS VERIFIED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    test_analytics_endpoints()
