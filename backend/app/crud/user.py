from sqlalchemy.orm import Session
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.schemas.user import UserCreate
from app.core.security import hash_password

def get_user_by_email(db: Session, email: str):
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, user: UserCreate):
    db_user = User(
        full_name=user.full_name,
        email=user.email,
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