import uuid
from sqlalchemy.orm import Session
from app.models.driver import Driver
from app.models.user import User, RoleEnum
from app.schemas.driver import DriverCreate, DriverUpdate
from app.core.security import hash_password


def get_drivers(db: Session, skip: int = 0, limit: int = 100):
    """Return all drivers with their linked user info."""
    drivers = db.query(Driver).join(User).offset(skip).limit(limit).all()
    return drivers


def get_driver(db: Session, driver_id: uuid.UUID):
    return db.query(Driver).filter(Driver.driver_id == driver_id).first()


def get_driver_by_user_id(db: Session, user_id: uuid.UUID):
    return db.query(Driver).filter(Driver.user_id == user_id).first()


def create_driver(db: Session, driver_in: DriverCreate):
    """Create a User with role=Driver, then a linked Driver record."""
    db_user = User(
        full_name=driver_in.full_name,
        email=driver_in.email,
        password=hash_password(driver_in.password),
        phone=driver_in.phone,
        role=RoleEnum.Driver,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    db_driver = Driver(
        user_id=db_user.user_id,
        license_number=driver_in.license_number,
        experience_years=driver_in.experience_years,
        address=driver_in.address,
        status=driver_in.status,
    )
    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


def update_driver(db: Session, db_driver: Driver, driver_in: DriverUpdate):
    """Update driver fields and optionally user fields (full_name, phone)."""
    if driver_in.license_number is not None:
        db_driver.license_number = driver_in.license_number
    if driver_in.experience_years is not None:
        db_driver.experience_years = driver_in.experience_years
    if driver_in.address is not None:
        db_driver.address = driver_in.address
    if driver_in.status is not None:
        db_driver.status = driver_in.status

    # Update linked user if name/phone provided
    if driver_in.full_name is not None and db_driver.user:
        db_driver.user.full_name = driver_in.full_name
    if driver_in.phone is not None and db_driver.user:
        db_driver.user.phone = driver_in.phone

    db.add(db_driver)
    db.commit()
    db.refresh(db_driver)
    return db_driver


def delete_driver(db: Session, db_driver: Driver):
    """Delete driver record and optionally the linked user."""
    user_id = db_driver.user_id
    db.delete(db_driver)
    db.commit()
    # Also delete the linked user
    user = db.query(User).filter(User.user_id == user_id).first()
    if user:
        db.delete(user)
        db.commit()
    return True
