import uuid
from typing import List, Optional
from datetime import date as dt_date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from pydantic import BaseModel, Field

from app.database import get_db
from app.models.attendance import Attendance
from app.models.driver import Driver
from app.models.user import User, RoleEnum
from app.models.leave_request import LeaveRequest
from app.core.deps import get_current_user
from app.routers.notifications import create_and_broadcast_notification

router = APIRouter()

# Pydantic Schemas
class AttendanceOut(BaseModel):
    attendance_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    driver_name: Optional[str] = None
    date: dt_date
    status: str
    remarks: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceMarkReq(BaseModel):
    driver_id: uuid.UUID
    date: Optional[dt_date] = None
    status: str = "Present"  # 'Present', 'Leave', 'Absent'
    remarks: Optional[str] = None


class DriverAttendanceSummary(BaseModel):
    driver_id: uuid.UUID
    driver_name: str
    total_days: int
    present_days: int
    leave_days: int
    absent_days: int
    attendance_rate: float
    history: List[AttendanceOut]


class LeaveRequestCreate(BaseModel):
    start_date: dt_date
    end_date: dt_date
    reason: str


class LeaveRequestReview(BaseModel):
    status: str  # "Approved" or "Rejected"
    review_notes: Optional[str] = None


class LeaveRequestOut(BaseModel):
    leave_id: uuid.UUID
    driver_id: Optional[uuid.UUID] = None
    driver_name: Optional[str] = None
    license_number: Optional[str] = None
    start_date: dt_date
    end_date: dt_date
    reason: str
    status: str
    reviewed_by: Optional[uuid.UUID] = None
    reviewer_name: Optional[str] = None
    review_notes: Optional[str] = None
    created_at: datetime
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


@router.post("/mark", response_model=AttendanceOut)
def mark_attendance(
    payload: AttendanceMarkReq,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin / Fleet Manager marks attendance for a driver on a specific date.
    """
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val not in ["Admin", "FleetManager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins and Fleet Managers can mark driver attendance."
        )

    driver = db.query(Driver).filter(Driver.driver_id == payload.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver record not found.")

    if payload.status not in ["Present", "Leave", "Absent"]:
        raise HTTPException(status_code=400, detail="Status must be 'Present', 'Leave', or 'Absent'.")

    mark_date = payload.date or dt_date.today()

    # Check if attendance already exists for this driver and date
    record = db.query(Attendance).filter(
        Attendance.driver_id == payload.driver_id,
        Attendance.date == mark_date
    ).first()

    if record:
        record.status = payload.status
        record.remarks = payload.remarks
        record.created_at = datetime.utcnow()
    else:
        record = Attendance(
            driver_id=payload.driver_id,
            date=mark_date,
            status=payload.status,
            remarks=payload.remarks,
            created_at=datetime.utcnow()
        )
        db.add(record)

    # Sync driver status if attendance is for today
    if mark_date == dt_date.today() and str(driver.status).lower() not in ["in transit", "assigned"]:
        if payload.status == "Present":
            driver.status = "Available"
            db.add(driver)
        elif payload.status in ["Leave", "Absent"]:
            driver.status = "Inactive"
            db.add(driver)

    db.commit()
    db.refresh(record)
    db.refresh(driver)

    driver_name = driver.user.full_name if (driver.user and driver.user.full_name) else "Driver"
    
    # Notify driver if user account linked
    if driver.user:
        create_and_broadcast_notification(
            db=db,
            title="📅 ATTENDANCE UPDATED",
            message=f"Your attendance for {mark_date.isoformat()} was marked as {payload.status.upper()}.",
            type="info",
            user_id=driver.user.user_id,
            target_role="Driver"
        )

    return AttendanceOut(
        attendance_id=record.attendance_id,
        driver_id=record.driver_id,
        driver_name=driver_name,
        date=record.date,
        status=record.status,
        remarks=record.remarks,
        created_at=record.created_at
    )


@router.post("/check-in", response_model=AttendanceOut)
def driver_check_in(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Driver self check-in action for today.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="No driver profile associated with your user account.")

    today_date = dt_date.today()
    record = db.query(Attendance).filter(
        Attendance.driver_id == driver.driver_id,
        Attendance.date == today_date
    ).first()

    if record:
        record.status = "Present"
        record.remarks = "Self Checked-In via FleetFlow Driver Gateway"
    else:
        record = Attendance(
            driver_id=driver.driver_id,
            date=today_date,
            status="Present",
            remarks="Self Checked-In via FleetFlow Driver Gateway",
            created_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return AttendanceOut(
        attendance_id=record.attendance_id,
        driver_id=record.driver_id,
        driver_name=current_user.full_name,
        date=record.date,
        status=record.status,
        remarks=record.remarks,
        created_at=record.created_at
    )


@router.post("/check-out", response_model=AttendanceOut)
def driver_check_out(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Driver self check-out / clock-out action for today.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="No driver profile associated with your user account.")

    today_date = dt_date.today()
    record = db.query(Attendance).filter(
        Attendance.driver_id == driver.driver_id,
        Attendance.date == today_date
    ).first()

    time_str = datetime.utcnow().strftime("%I:%M %p UTC")
    if record:
        record.remarks = f"{record.remarks or 'Checked-In'} • Clocked Out at {time_str}"
    else:
        record = Attendance(
            driver_id=driver.driver_id,
            date=today_date,
            status="Present",
            remarks=f"Self Clocked-Out via FleetFlow Gateway at {time_str}",
            created_at=datetime.utcnow()
        )
        db.add(record)

    db.commit()
    db.refresh(record)

    return AttendanceOut(
        attendance_id=record.attendance_id,
        driver_id=record.driver_id,
        driver_name=current_user.full_name,
        date=record.date,
        status=record.status,
        remarks=record.remarks,
        created_at=record.created_at
    )


@router.get("/driver/{driver_id}", response_model=DriverAttendanceSummary)
def get_driver_attendance_history(
    driver_id: uuid.UUID,
    start_date: Optional[dt_date] = None,
    end_date: Optional[dt_date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get full attendance history and metrics for a driver.
    """
    driver = db.query(Driver).filter(Driver.driver_id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    query = db.query(Attendance).filter(Attendance.driver_id == driver_id)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc()).all()
    driver_name = driver.user.full_name if (driver.user and driver.user.full_name) else "Driver"

    total = len(records)
    present = sum(1 for r in records if r.status == "Present")
    leave = sum(1 for r in records if r.status == "Leave")
    absent = sum(1 for r in records if r.status == "Absent")
    rate = round((present / total * 100), 1) if total > 0 else 100.0

    history_out = [
        AttendanceOut(
            attendance_id=r.attendance_id,
            driver_id=r.driver_id,
            driver_name=driver_name,
            date=r.date,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at
        ) for r in records
    ]

    return DriverAttendanceSummary(
        driver_id=driver.driver_id,
        driver_name=driver_name,
        total_days=total,
        present_days=present,
        leave_days=leave,
        absent_days=absent,
        attendance_rate=rate,
        history=history_out
    )


@router.get("/fleet")
def get_fleet_attendance(
    target_date: Optional[dt_date] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get fleet-wide daily attendance overview for management / dispatchers.
    Auto-defaults leave days for approved requests and restores normal status upon completion.
    """
    check_date = target_date or dt_date.today()
    today_date = dt_date.today()
    drivers = db.query(Driver).all()

    # Reconcile driver statuses, active trip/shipment attendance, and approved leave days
    from app.models.trip import Trip
    from app.models.shipment import Shipment
    from sqlalchemy import or_

    for d in drivers:
        # 1. Check if driver has an active approved leave request covering check_date
        active_leave_for_check_date = db.query(LeaveRequest).filter(
            LeaveRequest.driver_id == d.driver_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date <= check_date,
            LeaveRequest.end_date >= check_date
        ).first()

        # If on approved leave on check_date, ensure attendance is defaulted to Leave
        if active_leave_for_check_date:
            existing_att = db.query(Attendance).filter(
                Attendance.driver_id == d.driver_id,
                Attendance.date == check_date
            ).first()
            if not existing_att:
                new_att = Attendance(
                    driver_id=d.driver_id,
                    date=check_date,
                    status="Leave",
                    remarks=f"Approved Leave: {active_leave_for_check_date.reason}",
                    created_at=datetime.utcnow()
                )
                db.add(new_att)
        else:
            # 2. Check if driver is actively on an In-Transit Shipment or Trip on check_date
            active_trip = db.query(Trip).filter(
                Trip.driver_id == d.driver_id,
                or_(
                    and_(Trip.status == "In Transit", check_date == today_date),
                    and_(Trip.status.in_(["In Transit", "Completed", "Delivered"]), func.date(Trip.start_time) == check_date),
                    and_(Trip.status.in_(["In Transit", "Completed", "Delivered"]), func.date(Trip.created_at) == check_date)
                )
            ).first()

            active_shipment = None
            if not active_trip:
                active_shipment = db.query(Shipment).filter(
                    Shipment.driver_id == d.driver_id,
                    or_(
                        and_(Shipment.status == "In Transit", check_date == today_date),
                        and_(Shipment.status.in_(["In Transit", "Delivered"]), func.date(Shipment.created_at) == check_date)
                    )
                ).first()

            if active_trip or active_shipment:
                raw_cargo = active_trip.cargo if active_trip else (active_shipment.cargo_description or active_shipment.tracking_number)
                cargo_name = str(raw_cargo) if raw_cargo else "Active Freight"
                if cargo_name.strip().startswith("{") and cargo_name.strip().endswith("}"):
                    try:
                        import json
                        parsed = json.loads(cargo_name)
                        cargo_name = parsed.get("desc") or parsed.get("cargo") or parsed.get("tracking_number") or (active_shipment.tracking_number if active_shipment else "Freight Transit")
                    except Exception:
                        cargo_name = active_shipment.tracking_number if active_shipment else "Freight Transit"

                if not cargo_name or not str(cargo_name).strip():
                    cargo_name = active_shipment.tracking_number if active_shipment else "Freight Transit"

                remark_text = f"Auto-Marked Present: On Active Shipment ({cargo_name})"
                existing_att = db.query(Attendance).filter(
                    Attendance.driver_id == d.driver_id,
                    Attendance.date == check_date
                ).first()
                if not existing_att:
                    new_att = Attendance(
                        driver_id=d.driver_id,
                        date=check_date,
                        status="Present",
                        remarks=remark_text,
                        created_at=datetime.utcnow()
                    )
                    db.add(new_att)
                elif existing_att.status not in ["Present", "Leave"]:
                    existing_att.status = "Present"
                    existing_att.remarks = remark_text
                    db.add(existing_att)
                elif "Active Shipment" in (existing_att.remarks or "") and "{" in (existing_att.remarks or ""):
                    existing_att.remarks = remark_text
                    db.add(existing_att)

        # 3. Reconcile driver availability status for today
        if str(d.status).lower() not in ["in transit", "assigned"]:
            active_leave_today = db.query(LeaveRequest).filter(
                LeaveRequest.driver_id == d.driver_id,
                LeaveRequest.status == "Approved",
                LeaveRequest.start_date <= today_date,
                LeaveRequest.end_date >= today_date
            ).first()

            if active_leave_today:
                # Driver is currently on approved leave today -> Mark Inactive
                if str(d.status).lower() != "inactive":
                    d.status = "Inactive"
                    db.add(d)
            else:
                # Driver is NOT on approved leave today (leave completed or never applied)
                # If driver was previously Inactive from leave, restore to Available
                if str(d.status).lower() == "inactive":
                    today_att = db.query(Attendance).filter(
                        Attendance.driver_id == d.driver_id,
                        Attendance.date == today_date
                    ).first()
                    # If not explicitly marked Absent today, restore to normal Available status
                    if not today_att or today_att.status == "Present":
                        d.status = "Available"
                        db.add(d)

    db.commit()

    attendance_records = db.query(Attendance).filter(Attendance.date == check_date).all()
    att_map = {r.driver_id: r for r in attendance_records}

    result = []
    total = len(drivers)
    present_cnt = 0
    leave_cnt = 0
    absent_cnt = 0
    unmarked_cnt = 0

    for d in drivers:
        d_name = d.user.full_name if (d.user and d.user.full_name) else (d.license_number or "Driver")
        record = att_map.get(d.driver_id)
        
        status_val = record.status if record else "Unmarked"
        if status_val == "Present":
            present_cnt += 1
        elif status_val == "Leave":
            leave_cnt += 1
        elif status_val == "Absent":
            absent_cnt += 1
        else:
            unmarked_cnt += 1

        result.append({
            "driver_id": str(d.driver_id),
            "driver_name": d_name,
            "license_number": d.license_number,
            "status": status_val,
            "remarks": record.remarks if record else None,
            "attendance_id": str(record.attendance_id) if record else None,
            "date": check_date.isoformat()
        })

    return {
        "date": check_date.isoformat(),
        "summary": {
            "total_drivers": total,
            "present": present_cnt,
            "leave": leave_cnt,
            "absent": absent_cnt,
            "unmarked": unmarked_cnt,
            "presence_rate": round((present_cnt / total * 100), 1) if total > 0 else 0.0
        },
        "drivers": result
    }


@router.get("/history", response_model=List[AttendanceOut])
def get_fleet_attendance_history(
    start_date: Optional[dt_date] = None,
    end_date: Optional[dt_date] = None,
    driver_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get historical attendance logs across the fleet with optional driver and date range filtering.
    """
    query = db.query(Attendance)
    if driver_id:
        query = query.filter(Attendance.driver_id == driver_id)
    if start_date:
        query = query.filter(Attendance.date >= start_date)
    if end_date:
        query = query.filter(Attendance.date <= end_date)

    records = query.order_by(Attendance.date.desc(), Attendance.created_at.desc()).all()
    
    # Map driver names
    drivers = {d.driver_id: d for d in db.query(Driver).all()}
    
    result = []
    for r in records:
        d = drivers.get(r.driver_id)
        d_name = d.user.full_name if (d and d.user and d.user.full_name) else (d.license_number if d else "Driver")
        result.append(AttendanceOut(
            attendance_id=r.attendance_id,
            driver_id=r.driver_id,
            driver_name=d_name,
            date=r.date,
            status=r.status,
            remarks=r.remarks,
            created_at=r.created_at
        ))
    return result


@router.get("/me", response_model=DriverAttendanceSummary)
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get attendance history for the currently authenticated driver.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="No driver profile associated with this user account.")

    return get_driver_attendance_history(
        driver_id=driver.driver_id,
        start_date=dt_date.today() - timedelta(days=60),
        end_date=dt_date.today(),
        db=db,
        current_user=current_user
    )


# ===========================================================================
# LEAVE MANAGEMENT & APPROVAL FLOW
# ===========================================================================

@router.post("/leave/request", response_model=LeaveRequestOut)
def request_leave(
    payload: LeaveRequestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Driver submits a leave request for a date or date range.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only registered drivers can submit leave requests."
        )

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date cannot be earlier than start date."
        )

    if not payload.reason or not payload.reason.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid reason for the leave request."
        )

    leave_req = LeaveRequest(
        driver_id=driver.driver_id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        reason=payload.reason.strip(),
        status="Pending",
        created_at=datetime.utcnow()
    )
    db.add(leave_req)
    db.commit()
    db.refresh(leave_req)

    driver_name = current_user.full_name or driver.license_number or "Driver"

    # Notify Management (Admin, FleetManager, Dispatcher) of new leave request
    create_and_broadcast_notification(
        db=db,
        title="🏖️ NEW LEAVE REQUEST",
        message=f"Driver {driver_name} requested leave from {payload.start_date.isoformat()} to {payload.end_date.isoformat()}. Reason: {payload.reason[:60]}",
        type="warning",
        target_role="Management"
    )

    return LeaveRequestOut(
        leave_id=leave_req.leave_id,
        driver_id=leave_req.driver_id,
        driver_name=driver_name,
        license_number=driver.license_number,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        reason=leave_req.reason,
        status=leave_req.status,
        created_at=leave_req.created_at
    )


@router.get("/leave/my-requests", response_model=List[LeaveRequestOut])
def get_my_leave_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Driver views their submitted leave requests.
    """
    driver = db.query(Driver).filter(Driver.user_id == current_user.user_id).first()
    if not driver:
        return []

    requests = db.query(LeaveRequest).filter(
        LeaveRequest.driver_id == driver.driver_id
    ).order_by(LeaveRequest.created_at.desc()).all()

    driver_name = current_user.full_name or driver.license_number or "Driver"
    results = []
    for r in requests:
        reviewer_name = r.reviewer.full_name if r.reviewer else None
        results.append(LeaveRequestOut(
            leave_id=r.leave_id,
            driver_id=r.driver_id,
            driver_name=driver_name,
            license_number=driver.license_number,
            start_date=r.start_date,
            end_date=r.end_date,
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewer_name=reviewer_name,
            review_notes=r.review_notes,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at
        ))
    return results


@router.get("/leave/all", response_model=List[LeaveRequestOut])
def get_all_leave_requests(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin, Fleet Manager, Dispatcher lists leave requests.
    """
    query = db.query(LeaveRequest)
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(LeaveRequest.status == status_filter.capitalize())

    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    drivers = {d.driver_id: d for d in db.query(Driver).all()}
    users = {u.user_id: u for u in db.query(User).all()}

    results = []
    for r in requests:
        d = drivers.get(r.driver_id)
        d_user = users.get(d.user_id) if d and d.user_id else None
        d_name = d_user.full_name if d_user else (d.license_number if d else "Driver")
        
        rev_user = users.get(r.reviewed_by) if r.reviewed_by else None
        rev_name = rev_user.full_name if rev_user else None

        results.append(LeaveRequestOut(
            leave_id=r.leave_id,
            driver_id=r.driver_id,
            driver_name=d_name,
            license_number=d.license_number if d else None,
            start_date=r.start_date,
            end_date=r.end_date,
            reason=r.reason,
            status=r.status,
            reviewed_by=r.reviewed_by,
            reviewer_name=rev_name,
            review_notes=r.review_notes,
            created_at=r.created_at,
            reviewed_at=r.reviewed_at
        ))
    return results


@router.put("/leave/{leave_id}/review", response_model=LeaveRequestOut)
def review_leave_request(
    leave_id: uuid.UUID,
    payload: LeaveRequestReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Admin or Fleet Manager approves or rejects a leave request.
    If approved, automatically populates Attendance records with status='Leave' for each date in range.
    """
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
    if role_val not in ["Admin", "FleetManager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins and Fleet Managers can review leave requests."
        )

    leave_req = db.query(LeaveRequest).filter(LeaveRequest.leave_id == leave_id).first()
    if not leave_req:
        raise HTTPException(status_code=404, detail="Leave request not found.")

    if payload.status not in ["Approved", "Rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'Approved' or 'Rejected'.")

    leave_req.status = payload.status
    leave_req.reviewed_by = current_user.user_id
    leave_req.review_notes = payload.review_notes
    leave_req.reviewed_at = datetime.utcnow()

    driver = db.query(Driver).filter(Driver.driver_id == leave_req.driver_id).first()
    driver_name = driver.user.full_name if (driver and driver.user) else "Driver"

    # If APPROVED -> Automatically pre-populate Attendance records with 'Leave' for every day in range
    if payload.status == "Approved":
        curr_day = leave_req.start_date
        while curr_day <= leave_req.end_date:
            existing_att = db.query(Attendance).filter(
                Attendance.driver_id == leave_req.driver_id,
                Attendance.date == curr_day
            ).first()

            if existing_att:
                existing_att.status = "Leave"
                existing_att.remarks = f"Approved Leave: {leave_req.reason}"
                existing_att.created_at = datetime.utcnow()
            else:
                new_att = Attendance(
                    driver_id=leave_req.driver_id,
                    date=curr_day,
                    status="Leave",
                    remarks=f"Approved Leave: {leave_req.reason}",
                    created_at=datetime.utcnow()
                )
                db.add(new_att)
            
            curr_day += timedelta(days=1)

        # Reconcile driver status for today
        if driver and str(driver.status).lower() not in ["in transit", "assigned"]:
            today_date = dt_date.today()
            if leave_req.start_date <= today_date <= leave_req.end_date:
                driver.status = "Inactive"
                db.add(driver)

        # Notify driver
        if driver and driver.user:
            create_and_broadcast_notification(
                db=db,
                title="✅ LEAVE APPROVED",
                message=f"Your leave request for {leave_req.start_date.isoformat()} to {leave_req.end_date.isoformat()} has been APPROVED by {current_user.full_name or 'Management'}.",
                type="success",
                user_id=driver.user.user_id,
                target_role="Driver"
            )

    elif payload.status == "Rejected":
        # If driver was marked inactive due to this pending leave, restore to Available
        if driver and str(driver.status).lower() not in ["in transit", "assigned"]:
            driver.status = "Available"
            db.add(driver)

        # Notify driver of rejection
        if driver and driver.user:
            note_str = f" Reason: {payload.review_notes}" if payload.review_notes else ""
            create_and_broadcast_notification(
                db=db,
                title="❌ LEAVE REJECTED",
                message=f"Your leave request for {leave_req.start_date.isoformat()} to {leave_req.end_date.isoformat()} was REJECTED.{note_str}",
                type="warning",
                user_id=driver.user.user_id,
                target_role="Driver"
            )

    db.commit()
    db.refresh(leave_req)

    return LeaveRequestOut(
        leave_id=leave_req.leave_id,
        driver_id=leave_req.driver_id,
        driver_name=driver_name,
        license_number=driver.license_number if driver else None,
        start_date=leave_req.start_date,
        end_date=leave_req.end_date,
        reason=leave_req.reason,
        status=leave_req.status,
        reviewed_by=leave_req.reviewed_by,
        reviewer_name=current_user.full_name,
        review_notes=leave_req.review_notes,
        created_at=leave_req.created_at,
        reviewed_at=leave_req.reviewed_at
    )
