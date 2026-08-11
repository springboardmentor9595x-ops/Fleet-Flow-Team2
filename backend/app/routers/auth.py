from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, TokenRefreshRequest, OTPSendRequest, ResetPasswordRequest
from app.crud.user import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM, hash_password
from app.core.deps import get_current_user
from app.utils.mail import send_otp_email, send_welcome_email, send_password_changed_email
from jose import jwt, JWTError

router = APIRouter()

@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    created_user = create_user(db, user)
    
    # Secure onboarding welcome mail dispatch using background tasks
    background_tasks.add_task(send_welcome_email, created_user.email, created_user.full_name, created_user.role.value if hasattr(created_user.role, "value") else str(created_user.role))
        
    return created_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = get_user_by_email(db, credentials.email)
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(data={"sub": user.email})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/refresh", response_model=Token)
def refresh(payload: TokenRefreshRequest, db: Session = Depends(get_db)):
    try:
        decoded = jwt.decode(payload.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        if decoded.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = decoded.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token claims")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    new_access = create_access_token(data={"sub": user.email})
    new_refresh = create_refresh_token(data={"sub": user.email})
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_current_user(current_user = Depends(get_current_user)):
    return current_user

from pydantic import BaseModel
from typing import Optional

class UserUpdateMe(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

@router.put("/me", response_model=UserOut)
def update_current_user(
    payload: UserUpdateMe,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    if payload.phone is not None:
        current_user.phone = payload.phone
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/send-otp")
def send_otp(payload: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. You already have an account."
        )
    background_tasks.add_task(send_otp_email, payload.email, payload.otp)
    return {"status": "success", "sent": True}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    background_tasks.add_task(send_otp_email, payload.email, payload.otp)
    return {"status": "success", "sent": True}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.post("/send-otp")
def send_otp(payload: OTPSendRequest, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. You already have an account."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.get("/drivers")
def read_drivers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    from app.models.driver import Driver
    from app.models.user import User
    drivers = db.query(Driver).join(User).all()
    return [{"driver_id": d.driver_id, "user_id": d.user_id, "full_name": d.user.full_name} for d in drivers]

@router.post("/send-otp")
def send_otp(payload: OTPSendRequest, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. You already have an account."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    success = send_otp_email(payload.email, payload.otp)
    return {"status": "success", "sent": success}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = get_user_by_email(db, payload.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Dispatch password changed email notification
    try:
        send_password_changed_email(user.email, user.full_name)
    except Exception as e:
        print(f"[FleetFlow Mailer] Silent welcome email error: {e}")
        
    return {"status": "success"}