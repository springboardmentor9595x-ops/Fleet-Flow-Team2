import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleOut
from app.crud.vehicle import get_vehicles, get_vehicle, get_vehicle_by_registration, create_vehicle, update_vehicle, delete_vehicle
from app.core.deps import get_current_user
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.routers.notifications import create_and_broadcast_notification

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
    # Enforce role clearance checks (Only Admin and FleetManager)
    if current_user.role.value not in ["Admin", "FleetManager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Fleet Manager can register vehicles."
        )

    # Check for duplicate registration number
    existing = get_vehicle_by_registration(db, registration_number=vehicle.registration_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A vehicle with this registration number is already registered."
        )

    new_veh = create_vehicle(db=db, vehicle=vehicle)

    # If driver is assigned during vehicle creation, notify driver
    if new_veh.assigned_driver:
        drv = db.query(Driver).filter(Driver.driver_id == new_veh.assigned_driver).first()
        if drv and drv.user_id:
            try:
                create_and_broadcast_notification(
                    db=db,
                    title="🚚 Vehicle Assigned",
                    message=f"You have been assigned vehicle {new_veh.model} ({new_veh.registration_number}).",
                    type="info",
                    user_id=drv.user_id,
                    target_role="Driver"
                )
            except Exception as e:
                print(f"[Vehicle Notif Error] {e}")

    return new_veh

@router.put("/{vehicle_id}", response_model=VehicleOut)
def edit_vehicle(
    vehicle_id: uuid.UUID,
    vehicle: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Only Admin and FleetManager)
    if current_user.role.value not in ["Admin", "FleetManager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Fleet Manager can edit vehicles."
        )

    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    old_driver_id = db_vehicle.assigned_driver

    # If registration number is being changed, check for duplicate
    if vehicle.registration_number:
        existing = get_vehicle_by_registration(db, registration_number=vehicle.registration_number)
        if existing and existing.vehicle_id != vehicle_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A vehicle with this registration number is already registered."
            )

    updated_veh = update_vehicle(db=db, db_vehicle=db_vehicle, vehicle=vehicle)

    # Handle driver change notifications
    if vehicle.assigned_driver is not None and vehicle.assigned_driver != old_driver_id:
        # 1. Notify newly assigned driver
        new_drv = db.query(Driver).filter(Driver.driver_id == vehicle.assigned_driver).first()
        if new_drv and new_drv.user_id:
            try:
                create_and_broadcast_notification(
                    db=db,
                    title="🚚 Vehicle Assigned",
                    message=f"You have been assigned vehicle {updated_veh.model} ({updated_veh.registration_number}).",
                    type="info",
                    user_id=new_drv.user_id,
                    target_role="Driver"
                )
            except Exception as e:
                print(f"[Vehicle Notif Error] {e}")

        # 2. Notify previously assigned driver that vehicle has been reassigned
        if old_driver_id:
            old_drv = db.query(Driver).filter(Driver.driver_id == old_driver_id).first()
            if old_drv and old_drv.user_id and old_drv.driver_id != vehicle.assigned_driver:
                try:
                    create_and_broadcast_notification(
                        db=db,
                        title="🔄 Vehicle Reassigned",
                        message=f"Vehicle {updated_veh.model} ({updated_veh.registration_number}) has been unassigned from your roster.",
                        type="warning",
                        user_id=old_drv.user_id,
                        target_role="Driver"
                    )
                except Exception as e:
                    print(f"[Vehicle Notif Error] {e}")

    return updated_veh

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_vehicle(
    vehicle_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Enforce role clearance checks (Admin-only deletion)
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can delete vehicles."
        )

    db_vehicle = get_vehicle(db, vehicle_id=vehicle_id)
    if not db_vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    delete_vehicle(db=db, db_vehicle=db_vehicle)
    return None
