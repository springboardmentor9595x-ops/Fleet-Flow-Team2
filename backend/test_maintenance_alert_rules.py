import os
import sys
from datetime import date, datetime, timedelta

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.database import SessionLocal
from app.models.maintenance import VehicleMaintenance
from app.models.notification import Notification
from app.utils.mail import notify_maintenance_stakeholders
from app.tasks.maintenance import check_maintenance_alerts

def test_maintenance_alert_rules():
    db = SessionLocal()
    try:
        rec = db.query(VehicleMaintenance).first()
        assert rec is not None, "At least one maintenance record required for testing"

        print("=========================================================")
        print("TESTING EXACT MAINTENANCE NOTIFICATION & MAIL RULES")
        print("=========================================================")

        # 1. Test SCHEDULED -> No email, No web notification
        print("\n--- 1. Testing Scheduled Rule ---")
        initial_notif_count = db.query(Notification).count()
        mail_count = notify_maintenance_stakeholders(db, rec, alert_type="SCHEDULED")
        post_notif_count = db.query(Notification).count()
        assert mail_count == 0, f"Expected 0 emails on SCHEDULED, got {mail_count}"
        assert post_notif_count == initial_notif_count, "Expected 0 web notifications on SCHEDULED"
        print("PASS: Scheduled triggered NO email and NO web notification.")

        # 2. Test 5 DAYS BEFORE -> Email + Web application
        print("\n--- 2. Testing 5 Days Before Rule ---")
        initial_notif_count = db.query(Notification).count()
        mail_count = notify_maintenance_stakeholders(db, rec, alert_type="5_DAYS", days_left=5)
        post_notif_count = db.query(Notification).count()
        assert mail_count > 0, "Expected email dispatched on 5_DAYS"
        assert post_notif_count > initial_notif_count, "Expected web notification logged on 5_DAYS"
        print(f"PASS: 5 Days Before triggered {mail_count} email(s) and logged web notification.")

        # 3. Test 1 DAY BEFORE -> Email + Web application
        print("\n--- 3. Testing 1 Day Before Rule ---")
        initial_notif_count = db.query(Notification).count()
        mail_count = notify_maintenance_stakeholders(db, rec, alert_type="1_DAY", days_left=1)
        post_notif_count = db.query(Notification).count()
        assert mail_count > 0, "Expected email dispatched on 1_DAY"
        assert post_notif_count > initial_notif_count, "Expected web notification logged on 1_DAY"
        print(f"PASS: 1 Day Before triggered {mail_count} email(s) and logged web notification.")

        # 4. Test SERVICE DAY (DUE_TODAY) -> Email + Web application
        print("\n--- 4. Testing Service Day Rule ---")
        initial_notif_count = db.query(Notification).count()
        mail_count = notify_maintenance_stakeholders(db, rec, alert_type="DUE_TODAY", days_left=0)
        post_notif_count = db.query(Notification).count()
        assert mail_count > 0, "Expected email dispatched on DUE_TODAY"
        assert post_notif_count > initial_notif_count, "Expected web notification logged on DUE_TODAY"
        print(f"PASS: Service Day triggered {mail_count} email(s) and logged web notification.")

        # 5. Test OVERDUE -> 1 email per day, Web hourly
        print("\n--- 5. Testing Overdue Rule ---")
        # Hourly web alert
        web_mail_count = notify_maintenance_stakeholders(db, rec, alert_type="DUE_HOURLY", days_left=-3, send_email=False, send_web=True)
        assert web_mail_count == 0, "Hourly web alert should not send email"
        print("PASS: Overdue hourly web alert dispatched without email.")
        
        # Daily email
        daily_mail_count = notify_maintenance_stakeholders(db, rec, alert_type="DUE_HOURLY", days_left=-3, send_email=True, send_web=False)
        assert daily_mail_count > 0, "Daily overdue email should dispatch email"
        print(f"PASS: Overdue daily email dispatched ({daily_mail_count} recipients).")

        # 6. Test FINISH (RESOLVED) -> NO mail, ONLY web notification
        print("\n--- 6. Testing Finish / Resolved Rule ---")
        initial_notif_count = db.query(Notification).count()
        mail_count = notify_maintenance_stakeholders(db, rec, alert_type="RESOLVED")
        post_notif_count = db.query(Notification).count()
        assert mail_count == 0, f"Expected 0 emails on RESOLVED, got {mail_count}"
        assert post_notif_count > initial_notif_count, "Expected web notification on RESOLVED"
        print("PASS: Finish / Resolved triggered NO email and logged web notification.")

        print("\n=========================================================")
        print("ALL 6 EXACT MAINTENANCE NOTIFICATION RULES VERIFIED!")
        print("=========================================================")
    finally:
        db.close()

if __name__ == "__main__":
    test_maintenance_alert_rules()
