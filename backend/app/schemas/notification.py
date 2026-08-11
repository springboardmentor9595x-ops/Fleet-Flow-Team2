import uuid
from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NotificationOut(BaseModel):
    notification_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    message: Optional[str] = None
    type: Optional[str] = None
    is_read: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
