import json
import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from pydantic import BaseModel

from app.database import get_db
from app.models.notification import Notification
from app.models.user import User, RoleEnum
from app.core.deps import get_current_user

router = APIRouter()

# Pydantic Schemas
class NotificationOut(BaseModel):
    notification_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    target_role: Optional[str] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationCreateReq(BaseModel):
    title: str
    message: str
    type: str = "info"
    user_id: Optional[uuid.UUID] = None
    target_role: Optional[str] = None


def create_and_broadcast_notification(
    db: Session,
    title: str,
    message: str,
    type: str = "info",
    user_id: Optional[uuid.UUID] = None,
    target_role: Optional[str] = None,
    broadcast_ws: bool = True
) -> Notification:
    """
    Internal helper to create a Notification record in DB and broadcast via Redis WebSocket.
    """
    notif = Notification(
        user_id=user_id,
        target_role=target_role,
        title=title,
        message=message,
        type=type,
        is_read=False,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    if broadcast_ws:
        try:
            import redis
            from app.config import settings
            r = redis.from_url(getattr(settings, "redis_url", "redis://localhost:6379/0"))
            payload = {
                "type": "NOTIFICATION_EVENT",
                "notification_id": str(notif.notification_id),
                "user_id": str(notif.user_id) if notif.user_id else None,
                "target_role": notif.target_role,
                "title": notif.title,
                "message": notif.message,
                "notif_type": notif.type,
                "created_at": notif.created_at.isoformat()
            }
            r.publish("telemetry_channel", json.dumps(payload))
        except Exception as e:
            print(f"[Notification Broadcast] WS publish warning: {e}")

    return notif


@router.get("/", response_model=List[NotificationOut])
def get_user_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List notifications for current user with role-based scoping:
    - Admin: sees all system-level and role notifications
    - FleetManager: sees fleet/maintenance/assignment and user-targeted notifications
    - Dispatcher: sees shipment/delivery/route and user-targeted notifications
    - Driver: sees only their personal and driver-scoped notifications
    """
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)

    if role_val == "Admin":
        query = db.query(Notification)
    elif role_val in ["FleetManager", "Fleet Manager"]:
        query = db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role.in_(["FleetManager", "Fleet Manager", "Management", None])
            )
        )
    elif role_val == "Dispatcher":
        query = db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role.in_(["Dispatcher", "Management", None])
            )
        )
    elif role_val == "Driver":
        query = db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role == "Driver"
            )
        )
    else:
        query = db.query(Notification).filter(Notification.user_id == current_user.user_id)

    return query.order_by(Notification.created_at.desc()).limit(100).all()


@router.put("/{notification_id}/read", response_model=NotificationOut)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark an individual notification as read.
    """
    notif = db.query(Notification).filter(Notification.notification_id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Mark all notifications for the current user/role scope as read.
    """
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)

    if role_val == "Admin":
        db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    elif role_val in ["FleetManager", "Dispatcher"]:
        db.query(Notification).filter(
            Notification.is_read == False,
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role.in_([role_val, "Management", None])
            )
        ).update({"is_read": True}, synchronize_session=False)
    else:
        db.query(Notification).filter(
            Notification.is_read == False,
            Notification.user_id == current_user.user_id
        ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": "All notifications marked as read."}


@router.delete("/clear/all")
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Permanently delete all notifications for the current user's role scope from PostgreSQL database.
    """
    role_val = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)

    if role_val == "Admin":
        db.query(Notification).delete(synchronize_session=False)
    elif role_val in ["FleetManager", "Fleet Manager", "Dispatcher"]:
        db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role.in_([role_val, "Management", None])
            )
        ).delete(synchronize_session=False)
    else:
        db.query(Notification).filter(
            or_(
                Notification.user_id == current_user.user_id,
                Notification.target_role == "Driver"
            )
        ).delete(synchronize_session=False)

    db.commit()
    return {"message": "All scoped notifications deleted from database."}


@router.delete("/{notification_id}")
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a single notification record from database.
    """
    notif = db.query(Notification).filter(Notification.notification_id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    db.delete(notif)
    db.commit()
    return {"message": "Notification deleted successfully."}
