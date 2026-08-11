import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut
from app.crud.maintenance_crud import (
    get_maintenance_records,
    get_maintenance_by_vehicle,
    get_maintenance_record,
    create_maintenance_record,
    update_maintenance_record,
    delete_maintenance_record,
)
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=list[MaintenanceOut])
def read_maintenance(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_maintenance_records(db, skip=skip, limit=limit)


@router.get("/vehicle/{vehicle_id}", response_model=list[MaintenanceOut])
def read_maintenance_by_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_maintenance_by_vehicle(db, vehicle_id=vehicle_id)


@router.post("/", response_model=MaintenanceOut, status_code=status.HTTP_201_CREATED)
def add_maintenance(
    record: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers cannot create maintenance records."
        )
    return create_maintenance_record(db=db, record=record)


@router.put("/{maintenance_id}", response_model=MaintenanceOut)
def edit_maintenance(
    maintenance_id: uuid.UUID,
    record: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers cannot update maintenance records."
        )
    db_record = get_maintenance_record(db, maintenance_id=maintenance_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    return update_maintenance_record(db=db, db_record=db_record, record=record)


@router.delete("/{maintenance_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_maintenance(
    maintenance_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Drivers cannot delete maintenance records."
        )
    db_record = get_maintenance_record(db, maintenance_id=maintenance_id)
    if not db_record:
        raise HTTPException(status_code=404, detail="Maintenance record not found")
    delete_maintenance_record(db=db, db_record=db_record)
    return None
