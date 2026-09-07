import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserOut, Token, TokenRefreshRequest, OTPSendRequest, ResetPasswordRequest
from app.crud.user import get_user_by_email, create_user
from app.core.security import verify_password, create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM, hash_password
from app.core.deps import get_current_user
from app.utils.mail import send_otp_email, send_welcome_email, send_password_changed_email
from app.models.driver import Driver
from app.models.user import User

router = APIRouter()

# In-memory OTP storage for password resets: { email.lower(): { "otp": "123456", "expires_at": datetime } }
OTP_STORE = {}

class OTPVerifyRequest(BaseModel):
    email: str
    otp: str

class UserUpdateMe(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_email = user.email.strip().lower() if user.email else ""
    existing = get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    created_user = create_user(db, user)
    
    # Secure onboarding welcome mail dispatch
    role_str = created_user.role.value if hasattr(created_user.role, "value") else str(created_user.role)
    background_tasks.add_task(send_welcome_email, created_user.email, created_user.full_name, role_str)
        
    return created_user

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    clean_email = credentials.email.strip().lower() if credentials.email else ""
    user = get_user_by_email(db, clean_email)
    if not user or not verify_password(credentials.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    access_token = create_access_token(data={"sub": user.email, "role": role_val})
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
    
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    new_access = create_access_token(data={"sub": user.email, "role": role_val})
    new_refresh = create_refresh_token(data={"sub": user.email})
    return {"access_token": new_access, "refresh_token": new_refresh, "token_type": "bearer"}

@router.get("/me", response_model=UserOut)
def read_current_user(current_user = Depends(get_current_user)):
    return current_user

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

@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(current_user = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return None

@router.post("/send-otp")
def send_otp(payload: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    existing = get_user_by_email(db, clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. You already have an account."
        )
    background_tasks.add_task(send_otp_email, clean_email, payload.otp)
    return {"status": "success", "sent": True}

@router.post("/forgot-password")
def forgot_password(payload: OTPSendRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = get_user_by_email(db, clean_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Store OTP in memory valid for 10 minutes
    OTP_STORE[clean_email] = {
        "otp": payload.otp.strip(),
        "expires_at": datetime.utcnow() + timedelta(minutes=10)
    }
    
    # Send email in background
    background_tasks.add_task(send_otp_email, clean_email, payload.otp)
    return {"status": "success", "sent": True}

@router.post("/verify-otp")
def verify_otp(payload: OTPVerifyRequest):
    clean_email = payload.email.strip().lower()
    stored = OTP_STORE.get(clean_email)
    if not stored:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No OTP requested or OTP has expired. Please request a new code."
        )
    
    if datetime.utcnow() > stored["expires_at"]:
        OTP_STORE.pop(clean_email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new code."
        )
    
    if stored["otp"] != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code entered."
        )
    
    return {"status": "success", "valid": True}

@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_email = payload.email.strip().lower()
    user = get_user_by_email(db, clean_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email not registered. Please enter a valid account email."
        )
    
    # Update and commit the password change
    user.password = hash_password(payload.password)
    db.add(user)
    db.commit()
    
    # Clear stored OTP
    OTP_STORE.pop(clean_email, None)
    
    # Dispatch password changed email notification in background
    background_tasks.add_task(send_password_changed_email, user.email, user.full_name)
        
    return {"status": "success"}

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_password: str

@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Verify old password matches current database record
    if not verify_password(payload.old_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password entered is incorrect. Verification failed."
        )
    
    # 2. Check that new password and confirm password match
    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password and confirm password do not match."
        )
    
    # 3. Validate new password strength
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 6 characters in length."
        )
    
    # 4. Check that new password is not identical to old password
    if verify_password(payload.new_password, current_user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password cannot be the same as your old password."
        )
    
    # 5. Hash new password and persist to PostgreSQL
    current_user.password = hash_password(payload.new_password)
    current_user.updated_at = datetime.utcnow()
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # 6. Send security notification email in background
    try:
        background_tasks.add_task(send_password_changed_email, current_user.email, current_user.full_name)
    except Exception as me:
        print(f"[Mail Notice] {me}")
        
    return {
        "status": "success",
        "message": "Password updated successfully and synced with database."
    }

@router.get("/drivers")
def read_drivers(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    drivers = db.query(Driver).join(User).all()
    return [{"driver_id": d.driver_id, "user_id": d.user_id, "full_name": d.user.full_name} for d in drivers]


class AccountDeletionRequest(BaseModel):
    reason: Optional[str] = "User requested account deletion from Profile."

@router.post("/request-deletion")
def request_account_deletion(
    payload: AccountDeletionRequest = AccountDeletionRequest(),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    from app.routers.notifications import create_and_broadcast_notification
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    user_name = current_user.full_name or current_user.email
    user_email = current_user.email
    
    title = f"⚠️ Account Deletion Request: {user_name} ({role_str})"
    msg = (
        f"User '{user_name}' ({user_email}, Role: {role_str}) has submitted a request to delete their account.\n"
        f"Reason: {payload.reason or 'User requested deletion from Profile settings.'}\n"
        f"User ID: {current_user.user_id}. Please review and take action in Users & Roles."
    )
    
    # Broadcast notification to all Admin accounts
    notif = create_and_broadcast_notification(
        db=db,
        title=title,
        message=msg,
        type="warning",
        target_role="Admin",
        broadcast_ws=True
    )
    
    return {
        "status": "success",
        "message": "Account deletion request sent to Administrators for review.",
        "notification_id": str(notif.notification_id)
    }
