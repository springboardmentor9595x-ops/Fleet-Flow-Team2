from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.schemas.user import UserCreate
from app.core.security import hash_password

def get_user_by_email(db: Session, email: str):
    if not email:
        return None
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()

def create_user(db: Session, user: UserCreate):
    clean_email = user.email.strip().lower() if user.email else user.email
    db_user = User(
        full_name=user.full_name,
        email=clean_email,
        password=hash_password(user.password),
        phone=user.phone,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    if user.role == RoleEnum.Driver or (hasattr(user.role, "value") and user.role.value == "Driver") or user.role == "Driver":
        db_driver = Driver(user_id=db_user.user_id)
        db.add(db_driver)
        db.commit()
        
    return db_user