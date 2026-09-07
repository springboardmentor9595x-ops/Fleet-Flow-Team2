import app.models
from app.celery_app import celery_app
from app.database import SessionLocal
from app.models.shipment import Shipment
from datetime import datetime, timedelta

@celery_app.task(name="app.tasks.shipments.check_delayed_shipments")
def check_delayed_shipments():
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=24)  # adjust threshold as needed
        overdue = db.query(Shipment).filter(
            Shipment.status == "In Transit",
            Shipment.created_at <= cutoff,
        ).all()

        for shipment in overdue:
            shipment.status = "Delayed"
            db.add(shipment)
            print(f"[SHIPMENT ALERT] {shipment.tracking_number} marked as Delayed")
            try:
                from app.routers.notifications import create_and_broadcast_notification
                create_and_broadcast_notification(
                    db=db,
                    title="⚠️ SHIPMENT DELAYED",
                    message=f"Shipment #{shipment.tracking_number} ({shipment.origin} → {shipment.destination}) has exceeded expected transit duration and was marked DELAYED.",
                    type="warning",
                    target_role="Fleet Manager"
                )
            except Exception as ex:
                print(f"[Celery Delayed Notification Error] {ex}")

        db.commit()
        return f"Checked shipments — {len(overdue)} marked Delayed"
    finally:
        db.close()
