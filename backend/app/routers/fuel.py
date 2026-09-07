import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.fuel import FuelCreate, FuelUpdate, FuelOut
from app.models.fuel_record import FuelRecord
from app.models.user import User
from app.models.driver import Driver
from app.models.vehicle import Vehicle
from app.core.deps import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=FuelOut, status_code=status.HTTP_201_CREATED)
def add_fuel_refill(
    payload: FuelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_upper = current_user.role.value.upper()
    if role_upper == "DISPATCHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dispatchers are not authorized to log fuel refills."
        )
    elif role_upper == "DRIVER":
        # Ensure the vehicle is currently assigned to the driver
        drv = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not drv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Driver profile not found."
            )
        assigned_vehs = db.query(Vehicle).filter(Vehicle.assigned_driver == drv.driver_id).all()
        assigned_veh_ids = [v.vehicle_id for v in assigned_vehs]

        if not assigned_veh_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not currently have any assigned vehicle to log fuel records for."
            )
        
        if payload.vehicle_id:
            if payload.vehicle_id not in assigned_veh_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only log fuel refills for vehicles currently assigned to you."
                )
        else:
            payload.vehicle_id = assigned_veh_ids[0]
            
    # Verify vehicle exists
    veh = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
    if not veh:
        raise HTTPException(status_code=404, detail="Vehicle not found.")

    db_refill = FuelRecord(
        vehicle_id=payload.vehicle_id,
        fuel_amount=payload.fuel_amount,
        fuel_cost=payload.fuel_cost,
        fuel_type=payload.fuel_type or veh.fuel_type or "Diesel",
        mileage=payload.mileage,
        refill_date=payload.refill_date or datetime.utcnow().date()
    )
    db.add(db_refill)
    db.commit()
    db.refresh(db_refill)
    return db_refill

@router.put("/{fuel_id}", response_model=FuelOut)
def update_fuel_refill(
    fuel_id: uuid.UUID,
    payload: FuelUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(FuelRecord).filter(FuelRecord.fuel_id == fuel_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Fuel record not found.")

    role_upper = current_user.role.value.upper()
    if role_upper == "DISPATCHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dispatchers are not authorized to modify fuel records."
        )
    elif role_upper == "DRIVER":
        drv = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not drv:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Driver profile not found."
            )
        assigned_vehs = db.query(Vehicle).filter(Vehicle.assigned_driver == drv.driver_id).all()
        assigned_veh_ids = [v.vehicle_id for v in assigned_vehs]
        
        if record.vehicle_id not in assigned_veh_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers can only edit fuel records for their currently assigned vehicles."
            )
        if payload.vehicle_id and payload.vehicle_id not in assigned_veh_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Drivers cannot reassign a fuel record to a vehicle not assigned to them."
            )

    if payload.vehicle_id:
        veh = db.query(Vehicle).filter(Vehicle.vehicle_id == payload.vehicle_id).first()
        if not veh:
            raise HTTPException(status_code=404, detail="Vehicle not found.")
        record.vehicle_id = payload.vehicle_id

    if payload.fuel_amount is not None:
        record.fuel_amount = payload.fuel_amount
    if payload.fuel_cost is not None:
        record.fuel_cost = payload.fuel_cost
    if payload.fuel_type is not None:
        record.fuel_type = payload.fuel_type
    if payload.mileage is not None:
        record.mileage = payload.mileage
    if payload.refill_date is not None:
        record.refill_date = payload.refill_date

    db.commit()
    db.refresh(record)
    return record

@router.delete("/{fuel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_fuel_refill(
    fuel_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    record = db.query(FuelRecord).filter(FuelRecord.fuel_id == fuel_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Fuel record not found.")

    role_upper = current_user.role.value.upper()
    if role_upper not in ["ADMIN", "FLEETMANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins and Fleet Managers can delete fuel records."
        )

    db.delete(record)
    db.commit()
    return None

@router.get("/", response_model=list[FuelOut])
def get_fuel_refills(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_upper = current_user.role.value.upper()
    if role_upper == "DISPATCHER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Dispatchers are not authorized to view fuel records."
        )
    elif role_upper == "DRIVER":
        drv = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
        if not drv:
            return []
        assigned_vehs = db.query(Vehicle).filter(Vehicle.assigned_driver == drv.driver_id).all()
        veh_ids = [v.vehicle_id for v in assigned_vehs]
        
        if not veh_ids:
            return []
        return db.query(FuelRecord).filter(FuelRecord.vehicle_id.in_(veh_ids)).order_by(FuelRecord.refill_date.desc(), FuelRecord.created_at.desc()).all()
        
    return db.query(FuelRecord).order_by(FuelRecord.refill_date.desc(), FuelRecord.created_at.desc()).all()

@router.get("/trends")
def get_fuel_cost_trends(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    role_upper = current_user.role.value.upper()
    if role_upper not in ["ADMIN", "FLEETMANAGER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins or Fleet Managers can view fuel cost analytics and trends."
        )
        
    records = db.query(FuelRecord).all()
    total_cost = sum(r.fuel_cost for r in records if r.fuel_cost)
    total_liters = sum(r.fuel_amount for r in records if r.fuel_amount)
    
    # Simple monthly cost aggregation
    monthly_data = {}
    for r in records:
        if r.refill_date and r.fuel_cost:
            month_key = r.refill_date.strftime("%Y-%m")
            monthly_data[month_key] = monthly_data.get(month_key, 0.0) + r.fuel_cost
            
    return {
        "total_cost": round(total_cost, 2),
        "total_liters": round(total_liters, 2),
        "monthly_cost": monthly_data
    }
