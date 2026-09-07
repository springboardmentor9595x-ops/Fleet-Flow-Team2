import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.user import UserOut, UserCreate, UserUpdate
from app.models.user import User, RoleEnum
from app.models.driver import Driver
from app.crud.driver import delete_driver
from app.core.deps import get_current_user
from app.core.security import hash_password

router = APIRouter()

@router.get("/", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins are authorized to view all users."
        )
    return db.query(User).order_by(User.created_at.desc()).all()

@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can register new users."
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    new_user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
        phone=payload.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.put("/{user_id}", response_model=UserOut)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins can modify user records."
        )

    user_rec = db.query(User).filter(User.user_id == user_id).first()
    if not user_rec:
        raise HTTPException(status_code=404, detail="User record not found.")

    # Protect Admin from changing their own role
    if user_id == current_user.user_id and payload.role is not None and payload.role != user_rec.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot modify or change their own Admin role."
        )

    if payload.full_name is not None:
        user_rec.full_name = payload.full_name
    if payload.phone is not None:
        user_rec.phone = payload.phone
    if payload.role is not None:
        user_rec.role = payload.role

    db.add(user_rec)
    db.commit()
    db.refresh(user_rec)
    return user_rec

@router.put("/{user_id}/role", response_model=UserOut)
def update_user_role(
    user_id: uuid.UUID,
    role: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins are authorized to update user roles."
        )

    # Protect Admin from changing their own role
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Administrators cannot modify or change their own Admin role."
        )
    
    user_rec = db.query(User).filter(User.user_id == user_id).first()
    if not user_rec:
        raise HTTPException(status_code=404, detail="User record not found")
        
    try:
        new_role = RoleEnum(role)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid role. Supported values: Admin, FleetManager, Dispatcher, Driver"
        )
        
    user_rec.role = new_role
    db.add(user_rec)
    db.commit()
    db.refresh(user_rec)
    return user_rec

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Admins are authorized to delete user accounts."
        )
        
    if user_id == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own active Admin account."
        )
        
    user_rec = db.query(User).filter(User.user_id == user_id).first()
    if not user_rec:
        raise HTTPException(status_code=404, detail="User record not found")
        
    # Check if there's a driver profile linked to this user
    driver_rec = db.query(Driver).filter(Driver.user_id == user_id).first()
    if driver_rec:
        delete_driver(db, driver_rec)
    else:
        db.delete(user_rec)
        db.commit()
        
    return None
