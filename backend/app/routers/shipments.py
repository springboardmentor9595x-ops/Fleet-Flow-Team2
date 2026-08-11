import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from app.database import get_db
from app.schemas.shipment import ShipmentCreate, ShipmentUpdate, ShipmentOut
from app.crud.shipment import (
    get_shipments,
    get_shipments_by_driver,
    get_shipment,
    create_shipment,
    update_shipment,
    delete_shipment,
    get_shipment_history
)
from app.core.deps import get_current_user
from app.utils.routing import DEPOTS

router = APIRouter()

@router.get("/", response_model=list[ShipmentOut])
def read_shipments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    role_upper = current_user.role.value.upper()
    
    # 1. Role-scoped visibility checks
    if role_upper == "DRIVER":
        return get_shipments_by_driver(db, user_id=current_user.user_id)
        
    # Admin / FleetManager / Dispatcher see all shipments
    shipments = get_shipments(db, skip=skip, limit=limit)
    
    # Live Alert Checking: flag delayed shipments
    for s in shipments:
        if s.status not in ["Delivered", "Cancelled"] and s.expected_delivery_time:
            if s.expected_delivery_time < datetime.utcnow():
                s.status = "Delayed"
                db.add(s)
    db.commit()
    
    return shipments

@router.post("/", response_model=ShipmentOut, status_code=status.HTTP_201_CREATED)
def add_shipment(
    shipment: ShipmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Driver role check
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    # Validate locations are distinct
    src = shipment.source.strip()
    dest = shipment.destination.strip()
    if src.upper() == dest.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and destination locations must be distinct."
        )

    # Resolve coordinates to check validity
    from app.utils.routing import geocode_address
    src_coords = geocode_address(src)
    dest_coords = geocode_address(dest)
    if not src_coords:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to geocode source location: {src}"
        )
    if not dest_coords:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unable to geocode destination location: {dest}"
        )

    return create_shipment(db=db, shipment=shipment)

@router.put("/{shipment_id}", response_model=ShipmentOut)
def edit_shipment(
    shipment_id: uuid.UUID,
    payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Driver role check
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    db_shipment = get_shipment(db, shipment_id=shipment_id)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment record not found")

    return update_shipment(db=db, db_shipment=db_shipment, shipment=payload)

@router.put("/{shipment_id}/status", response_model=ShipmentOut)
def update_delivery_status(
    shipment_id: uuid.UUID,
    status_payload: ShipmentUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    db_shipment = get_shipment(db, shipment_id=shipment_id)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment record not found")

    new_status = status_payload.status
    valid_statuses = ["Created", "Assigned", "In Transit", "Delayed", "Delivered", "Cancelled"]
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status value. Must be in: {valid_statuses}")

    # Scoped permissions: Drivers can only transition status for shipments assigned to them!
    if current_user.role.value.upper() == "DRIVER":
        # Check if shipment is assigned to driver
        from app.models.driver import Driver
        driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not driver or db_shipment.driver_id != driver.driver_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized. Drivers can only modify statuses of their assigned shipments."
            )

    db_shipment.status = new_status
    db.add(db_shipment)
    db.commit()
    db.refresh(db_shipment)
    return db_shipment

@router.get("/alerts", response_model=list[ShipmentOut])
def read_shipment_alerts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    all_shipments = get_shipments(db, skip=0, limit=1000)
    alert_shipments = []
    now = datetime.utcnow()
    
    for s in all_shipments:
        if s.status in ["Delivered", "Cancelled"] or not s.expected_delivery_time:
            continue
        
        # Check if past expected delivery (Delayed)
        if s.expected_delivery_time < now:
            if s.status != "Delayed":
                s.status = "Delayed"
                db.add(s)
            alert_shipments.append(s)
        # Check if approaching (within 2 hours)
        elif (s.expected_delivery_time - now).total_seconds() <= 7200:
            alert_shipments.append(s)
            
    db.commit()
    return alert_shipments

@router.get("/history/{filter_key}/{filter_val}", response_model=list[ShipmentOut])
def read_shipment_history(
    filter_key: str,
    filter_val: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if filter_key not in ["vehicle", "driver", "customer"]:
        raise HTTPException(status_code=400, detail="Invalid filter key. Must be vehicle, driver, or customer.")
    
    if filter_key in ["vehicle", "driver"]:
        try:
            val_uuid = uuid.UUID(filter_val)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid UUID string for filter_key: {filter_key}")
        return get_shipment_history(db, filter_key=filter_key, filter_val=val_uuid)
        
    return get_shipment_history(db, filter_key=filter_key, filter_val=filter_val)

@router.delete("/{shipment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_shipment(
    shipment_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Driver role check
    if current_user.role.value.upper() == "DRIVER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation rejected. Driver clearance is insufficient."
        )

    db_shipment = get_shipment(db, shipment_id=shipment_id)
    if not db_shipment:
        raise HTTPException(status_code=404, detail="Shipment record not found")

    delete_shipment(db=db, db_shipment=db_shipment)
    return None
