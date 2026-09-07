import uuid
from sqlalchemy.orm import Session
from app.models.maintenance import VehicleMaintenance
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate


def get_maintenance_records(db: Session, skip: int = 0, limit: int = 100):
    return db.query(VehicleMaintenance).order_by(VehicleMaintenance.created_at.desc()).offset(skip).limit(limit).all()


def get_maintenance_by_vehicle(db: Session, vehicle_id: uuid.UUID):
    return db.query(VehicleMaintenance).filter(VehicleMaintenance.vehicle_id == vehicle_id).order_by(VehicleMaintenance.created_at.desc()).all()


def get_maintenance_record(db: Session, maintenance_id: uuid.UUID):
    return db.query(VehicleMaintenance).filter(VehicleMaintenance.maintenance_id == maintenance_id).first()


def ensure_next_maintenance_record(db: Session, db_record: VehicleMaintenance):
    """
    If a maintenance record has next_service_date specified, check if a future 
    maintenance record already exists for that vehicle on that due date.
    If not, automatically create a new 'Scheduled' maintenance record for that vehicle.
    """
    if not db_record or not db_record.next_service_date:
        return None

    from datetime import datetime

    # Check if a maintenance record already exists for this vehicle on that target service date
    existing = db.query(VehicleMaintenance).filter(
        VehicleMaintenance.vehicle_id == db_record.vehicle_id,
        VehicleMaintenance.service_date == db_record.next_service_date
    ).first()

    if not existing:
        # Carry forward the previous service cost as same service is expected to incur the same cost
        inherited_cost = float(db_record.cost) if db_record.cost is not None else 0.0
        inherited_remarks = db_record.remarks if db_record.remarks else f"Auto-scheduled next {db_record.maintenance_type or 'service'}"

        next_rec = VehicleMaintenance(
            vehicle_id=db_record.vehicle_id,
            maintenance_type=db_record.maintenance_type or "General Inspection",
            service_date=db_record.next_service_date,
            next_service_date=None,
            cost=inherited_cost,
            remarks=inherited_remarks,
            status="Scheduled",
            notification_stage="SCHEDULED",
            last_alert_sent=datetime.utcnow(),
        )
        db.add(next_rec)
        db.commit()
        db.refresh(next_rec)

        # Notify stakeholders about the automatically scheduled next service
        try:
            from app.utils.mail import notify_maintenance_stakeholders
            notify_maintenance_stakeholders(db=db, maintenance_record=next_rec, alert_type="SCHEDULED")
        except Exception as ex:
            print(f"[Maintenance Auto-Schedule] Stakeholder notification notice: {ex}")

        return next_rec
    return None


def create_maintenance_record(db: Session, record: MaintenanceCreate):
    from app.models.vehicle import Vehicle
    from datetime import datetime
    db_record = VehicleMaintenance(
        vehicle_id=record.vehicle_id,
        maintenance_type=record.maintenance_type,
        service_date=record.service_date,
        next_service_date=record.next_service_date,
        cost=record.cost,
        remarks=record.remarks,
        status=record.status,
        notification_stage="SCHEDULED",
        last_alert_sent=datetime.utcnow(),
    )
    db.add(db_record)

    # Sync Vehicle status
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == record.vehicle_id).first()
    if vehicle:
        if record.status in ["Completed", "Resolved"]:
            vehicle.status = "Available"
        else:
            vehicle.status = "Maintenance"
        db.add(vehicle)

    db.commit()
    db.refresh(db_record)

    # If next_service_date is provided, automatically create the next scheduled maintenance record
    if db_record.next_service_date:
        ensure_next_maintenance_record(db, db_record)

    return db_record


def update_maintenance_record(db: Session, db_record: VehicleMaintenance, record: MaintenanceUpdate):
    from app.models.vehicle import Vehicle
    update_data = record.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    db.add(db_record)

    # Sync Vehicle status
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_record.vehicle_id).first()
    if vehicle:
        if db_record.status in ["Completed", "Resolved"]:
            vehicle.status = "Available"
        else:
            vehicle.status = "Maintenance"
        db.add(vehicle)

    db.commit()
    db.refresh(db_record)

    # Notify stakeholders if service has been completed/resolved
    if db_record.status in ["Completed", "Resolved"]:
        try:
            from app.utils.mail import notify_maintenance_stakeholders
            notify_maintenance_stakeholders(db=db, maintenance_record=db_record, alert_type="RESOLVED")
        except Exception as ex:
            print(f"[Maintenance CRUD] Completion notification notice: {ex}")

    # If next_service_date is provided, automatically create the next scheduled maintenance record
    if db_record.next_service_date:
        ensure_next_maintenance_record(db, db_record)

    return db_record


def delete_maintenance_record(db: Session, db_record: VehicleMaintenance):
    from app.models.vehicle import Vehicle
    vehicle = db.query(Vehicle).filter(Vehicle.vehicle_id == db_record.vehicle_id).first()
    if vehicle and vehicle.status == "Maintenance":
        # Check if there are other active maintenance records
        other_active = db.query(VehicleMaintenance).filter(
            VehicleMaintenance.vehicle_id == vehicle.vehicle_id,
            VehicleMaintenance.maintenance_id != db_record.maintenance_id,
            ~VehicleMaintenance.status.in_(["Completed", "Resolved"])
        ).first()
        if not other_active:
            vehicle.status = "Available"
            db.add(vehicle)

    db.delete(db_record)
    db.commit()
    return True
