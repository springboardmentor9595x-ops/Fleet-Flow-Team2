import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.driver import DriverCreate, DriverUpdate, DriverOut
from app.crud.driver import get_drivers, get_driver, create_driver, update_driver, delete_driver
from app.crud.user import get_user_by_email
from app.core.deps import get_current_user

router = APIRouter()


def _serialize_driver(d) -> dict:
    """Flatten Driver + User into DriverOut-compatible dict."""
    return {
        "driver_id": d.driver_id,
        "user_id": d.user_id,
        "full_name": d.user.full_name if d.user else "",
        "email": d.user.email if d.user else "",
        "phone": d.user.phone if d.user else None,
        "license_number": d.license_number,
        "experience_years": d.experience_years,
        "address": d.address,
        "status": d.status,
        "created_at": d.created_at,
    }


@router.get("/", response_model=list[DriverOut])
def read_drivers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    drivers = get_drivers(db, skip=skip, limit=limit)
    return [DriverOut(**_serialize_driver(d)) for d in drivers]


@router.get("/me", response_model=DriverOut)
def get_my_driver_profile(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from app.models.driver import Driver
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return DriverOut(**_serialize_driver(driver))


@router.put("/me/status", response_model=DriverOut)
def toggle_driver_status(
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    import json, redis
    from app.models.driver import Driver
    from app.config import settings
    
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found for current user")

    new_status = payload.get("status", "Available")
    if new_status not in ["Available", "Inactive", "Assigned", "In Transit"]:
        raise HTTPException(status_code=400, detail="Invalid driver status")

    driver.status = new_status
    db.commit()
    db.refresh(driver)

    # Publish real-time status update to WebSocket telemetry
    try:
        r_client = redis.from_url(settings.redis_url)
        ws_payload = {
            "type": "DRIVER_STATUS_UPDATE",
            "driver_id": str(driver.driver_id),
            "user_id": str(driver.user_id),
            "full_name": current_user.full_name,
            "status": driver.status
        }
        r_client.publish("telemetry_channel", json.dumps(ws_payload))
    except Exception as ex:
        print(f"[Driver Status Broadcast] WebSocket pub error: {ex}")

    return DriverOut(**_serialize_driver(driver))


@router.get("/{driver_id}", response_model=DriverOut)
def read_driver(
    driver_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    d = get_driver(db, driver_id=driver_id)
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")
    return DriverOut(**_serialize_driver(d))


@router.post("/", response_model=DriverOut, status_code=status.HTTP_201_CREATED)
def register_driver(
    driver_in: DriverCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # Only Admin / FleetManager can register drivers
    if current_user.role.value not in ["Admin", "FleetManager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin or Fleet Manager can register drivers."
        )

    # Check email not already taken
    existing = get_user_by_email(db, driver_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    d = create_driver(db=db, driver_in=driver_in)
    return DriverOut(**_serialize_driver(d))


@router.put("/{driver_id}", response_model=DriverOut)
def edit_driver(
    driver_id: uuid.UUID,
    driver_in: DriverUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    d = get_driver(db, driver_id=driver_id)
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Allow Admin, FleetManager, OR the driver updating their own profile
    is_self = (d.user_id == current_user.user_id)
    if current_user.role.value not in ["Admin", "FleetManager"] and not is_self:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin, Fleet Manager, or the driver themselves can update this record."
        )

    d = update_driver(db=db, db_driver=d, driver_in=driver_in)
    return DriverOut(**_serialize_driver(d))


@router.delete("/{driver_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_driver(
    driver_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admin can remove drivers."
        )

    d = get_driver(db, driver_id=driver_id)
    if not d:
        raise HTTPException(status_code=404, detail="Driver not found")

    delete_driver(db=db, db_driver=d)
    return None
