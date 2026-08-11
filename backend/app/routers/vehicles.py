import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleOut
from app.crud.vehicle import get_vehicles, get_vehicle, get_vehicle_by_registration, create_vehicle, update_vehicle, delete_vehicle
from app.core.deps import get_current_user

router = APIRouter()

@router.get("/", response_model=list[VehicleOut])
def read_vehicles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    return get_vehicles(db, skip=skip, limit=limit)

@router.get("/{vehicle_id}", response_model=VehicleOut)
def read_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return db_vehicle

@router.post("/", response_model=VehicleOut, status_code=status.HTTP_201_CREATED)
def add_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Driver is unauthorized)
    if current_user.role.value == "Driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    # Check for duplicate registration number
    existing = get_vehicle_by_registration(db, registration_number=vehicle.registration_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vehicle with this registration number is already registered."
        )

    return create_vehicle(db=db, vehicle=vehicle)

@router.put("/{vehicle_id}", response_model=VehicleOut)
def edit_vehicle(
    vehicle_id: uuid.UUID,
    vehicle: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Driver is unauthorized)
    if current_user.role.value == "Driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # If registration number is being changed, check for duplicate
    if vehicle.registration_number:
        existing = get_vehicle_by_registration(db, registration_number=vehicle.registration_number)
        if existing and existing.vehicle_id != vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vehicle with this registration number is already registered."
            )

    return update_vehicle(db=db, db_vehicle=db_vehicle, vehicle=vehicle)

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Driver is unauthorized)
    if current_user.role.value == "Driver":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    delete_vehicle(db=db, db_vehicle=db_vehicle)
    return None
