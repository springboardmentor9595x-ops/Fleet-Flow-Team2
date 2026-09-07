import app.models
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.maintenance import VehicleMaintenance
from app.utils.mail import notify_maintenance_stakeholders
from datetime import date, datetime, timedelta

@celery_app.task(name="app.tasks.maintenance.check_maintenance_alerts")
def check_maintenance_alerts():
    db = SessionLocal()
    alerts_triggered = 0
    now = datetime.utcnow()
    today = date.today()

    try:
        from app.crud.maintenance_crud import ensure_next_maintenance_record
        
        # 0. Sweep for any records with next_service_date that haven't had their future service created yet
        all_with_next = db.query(VehicleMaintenance).filter(
            VehicleMaintenance.next_service_date.isnot(None)
        ).all()
        for r in all_with_next:
            ensure_next_maintenance_record(db, r)

        # Ignore records that are already Resolved or Completed
        active_records = db.query(VehicleMaintenance).filter(
            ~VehicleMaintenance.status.in_(["Resolved", "Completed"])
        ).all()

        for record in active_records:
            target_date = record.service_date or record.next_service_date
            if not target_date:
                continue

            days_diff = (target_date - today).days

            # 1. 5-Day Advance Notice (Sends Management Email + In-App Dashboard Notification)
            if 0 < days_diff <= 5 and days_diff > 1 and record.notification_stage not in ["5_DAYS", "1_DAY", "DUE_TODAY", "DUE_HOURLY"]:
                print(f"[CELERY MAINTENANCE] 5-Day Advance Alert for Vehicle {record.vehicle_id} (Service Date: {target_date}) -> Email to Management & Dashboard Push")
                notify_maintenance_stakeholders(db, record, alert_type="5_DAYS", days_left=days_diff)
                record.notification_stage = "5_DAYS"
                record.last_alert_sent = now
                db.add(record)
                alerts_triggered += 1

            # 2. 1-Day Advance Notice (Sends Urgent Management Email + In-App Dashboard Notification)
            elif days_diff == 1 and record.notification_stage not in ["1_DAY", "DUE_TODAY", "DUE_HOURLY"]:
                print(f"[CELERY MAINTENANCE] 1-Day Urgent Notice for Vehicle {record.vehicle_id} (Service Date: {target_date}) -> Urgent Email to Management & Dashboard Push")
                notify_maintenance_stakeholders(db, record, alert_type="1_DAY", days_left=1)
                record.notification_stage = "1_DAY"
                record.last_alert_sent = now
                db.add(record)
                alerts_triggered += 1

            # 3. ON SERVICE DAY -> Sends Service Due Today Email + In-App Dashboard Notification
            elif days_diff == 0 and record.notification_stage not in ["DUE_TODAY", "DUE_HOURLY"]:
                print(f"[CELERY MAINTENANCE] Service Due Today Notice for Vehicle {record.vehicle_id} (Scheduled: {target_date}) -> Email & Dashboard Notification")
                notify_maintenance_stakeholders(db, record, alert_type="DUE_TODAY", days_left=0)
                record.notification_stage = "DUE_TODAY"
                record.last_alert_sent = now
                db.add(record)
                alerts_triggered += 1

            # 4. MISSED / OVERDUE SERVICE DAY
            # Policy: Exactly ONE email for the whole day (24h), Web application alerting hourly
            elif days_diff < 0:
                record.notification_stage = "DUE_HOURLY"
                
                # Check 1: Web application hourly notification
                elapsed_web = (now - record.last_alert_sent).total_seconds() if record.last_alert_sent else 999999
                if elapsed_web >= 3600:  # 1 hour gap
                    print(f"[CELERY MAINTENANCE] Hourly Overdue Web Alert for Vehicle {record.vehicle_id} ({abs(days_diff)} days past due) -> Web Notification Only")
                    notify_maintenance_stakeholders(db, record, alert_type="DUE_HOURLY", days_left=days_diff, send_email=False, send_web=True)
                    record.last_alert_sent = now
                    db.add(record)
                    alerts_triggered += 1

                # Check 2: Daily Overdue Email (Exactly ONE email for a whole day / 24 hours)
                elapsed_mail = (now - record.last_due_alert).total_seconds() if record.last_due_alert else 999999
                if elapsed_mail >= 86400:  # 24 hours gap
                    print(f"[CELERY MAINTENANCE] Daily Overdue Email for Vehicle {record.vehicle_id} ({abs(days_diff)} days past due) -> 1 Email per Day to Stakeholders")
                    notify_maintenance_stakeholders(db, record, alert_type="DUE_HOURLY", days_left=days_diff, send_email=True, send_web=False)
                    record.last_due_alert = now
                    db.add(record)
                    alerts_triggered += 1

        db.commit()
        return f"Checked maintenance — {alerts_triggered} notification(s) dispatched."
    except Exception as ex:
        db.rollback()
        print(f"[CELERY MAINTENANCE] Error during check_maintenance_alerts: {ex}")
        return f"Error: {ex}"
    finally:
        db.close()
