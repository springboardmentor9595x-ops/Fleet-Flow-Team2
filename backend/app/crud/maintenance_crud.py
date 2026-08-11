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


def create_maintenance_record(db: Session, record: MaintenanceCreate):
    db_record = VehicleMaintenance(
        vehicle_id=record.vehicle_id,
        maintenance_type=record.maintenance_type,
        service_date=record.service_date,
        next_service_date=record.next_service_date,
        cost=record.cost,
        remarks=record.remarks,
        status=record.status,
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def update_maintenance_record(db: Session, db_record: VehicleMaintenance, record: MaintenanceUpdate):
    update_data = record.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_record, key, value)
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


def delete_maintenance_record(db: Session, db_record: VehicleMaintenance):
    db.delete(db_record)
    db.commit()
    return True
