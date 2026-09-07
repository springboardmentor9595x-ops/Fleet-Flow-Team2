import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import Base, engine

# Import ALL models so SQLAlchemy creates all tables on startup
from app.models import user  # noqa: F401
from app.models import driver  # noqa: F401
from app.models import vehicle  # noqa: F401
from app.models import shipment  # noqa: F401
from app.models import trip  # noqa: F401
from app.models import gps_tracking  # noqa: F401
from app.models import maintenance  # noqa: F401
from app.models import fuel_record  # noqa: F401
from app.models import notification  # noqa: F401
from app.models import attendance  # noqa: F401

from app.routers import auth, vehicles, trips, websockets, shipments, drivers, maintenance, users, fuel, notifications, attendance, reports, analytics


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name)

    origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
    app.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Dashboards"])
    app.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
    app.include_router(drivers.router, prefix="/drivers", tags=["Drivers"])
    app.include_router(trips.router, prefix="/trips", tags=["Trips"])
    app.include_router(shipments.router, prefix="/shipments", tags=["Shipments"])
    app.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])
    app.include_router(users.router, prefix="/users", tags=["Users"])
    app.include_router(fuel.router, prefix="/fuel", tags=["Fuel"])
    app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
    app.include_router(attendance.router, prefix="/attendance", tags=["Attendance"])
    app.include_router(reports.router, prefix="/reports", tags=["Reports"])
    app.include_router(websockets.router, prefix="/ws", tags=["WebSockets"])

    @app.get("/")
    def root():
        return {"message": "FleetFlow API running"}

    @app.on_event("startup")
    async def startup_event():
        if settings.create_tables_on_startup:
            try:
                Base.metadata.create_all(bind=engine)
            except Exception:
                pass
            
            # Ensure trips table has created_at column
            from sqlalchemy import text
            with engine.connect() as conn:
                try:
                    conn.execute(text("SELECT created_at FROM trips LIMIT 1"))
                except Exception:
                    try:
                        conn.execute(text("commit"))
                        conn.execute(text("ALTER TABLE trips ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP"))
                        conn.execute(text("commit"))
                        print("[Database] Added created_at column to trips table successfully.")
                    except Exception as ex:
                        print(f"[Database] Failed to alter trips table: {ex}")

            # Ensure fuel_records table has all required columns
            with engine.connect() as conn:
                for col, col_type in [
                    ("fuel_amount", "FLOAT"),
                    ("fuel_cost", "FLOAT"),
                    ("mileage", "FLOAT"),
                    ("refill_date", "DATE"),
                    ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                ]:
                    try:
                        conn.execute(text(f"SELECT {col} FROM fuel_records LIMIT 1"))
                    except Exception:
                        try:
                            conn.execute(text("commit"))
                            conn.execute(text(f"ALTER TABLE fuel_records ADD COLUMN {col} {col_type}"))
                            conn.execute(text("commit"))
                            print(f"[Database] Added {col} column to fuel_records successfully.")
                        except Exception as ex:
                            print(f"[Database] Failed to alter fuel_records table with {col}: {ex}")

            # Ensure notifications table has all columns
            with engine.connect() as conn:
                for col, col_type in [
                    ("target_role", "VARCHAR(50)"),
                    ("title", "VARCHAR(255)"),
                    ("message", "TEXT"),
                    ("type", "VARCHAR(50) DEFAULT 'info'"),
                    ("is_read", "BOOLEAN DEFAULT FALSE"),
                    ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                ]:
                    try:
                        conn.execute(text(f"SELECT {col.split()[0]} FROM notifications LIMIT 1"))
                    except Exception:
                        try:
                            conn.execute(text("commit"))
                            conn.execute(text(f"ALTER TABLE notifications ADD COLUMN {col} {col_type}"))
                            conn.execute(text("commit"))
                            print(f"[Database] Added {col} to notifications.")
                        except Exception as ex:
                            pass

            # Ensure attendance table has all columns
            with engine.connect() as conn:
                for col, col_type in [
                    ("date", "DATE"),
                    ("status", "VARCHAR(20) DEFAULT 'Present'"),
                    ("remarks", "VARCHAR(255)"),
                    ("created_at", "TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
                ]:
                    try:
                        conn.execute(text(f"SELECT {col.split()[0]} FROM attendance LIMIT 1"))
                    except Exception:
                        try:
                            conn.execute(text("commit"))
                            conn.execute(text(f"ALTER TABLE attendance ADD COLUMN {col} {col_type}"))
                            conn.execute(text("commit"))
                            print(f"[Database] Added {col} to attendance.")
                        except Exception as ex:
                            pass
        
        # Start WebSocket telemetry background simulation loop and Redis Pub/Sub listener
        from app.routers.websockets import run_telemetry_simulation, redis_listener
        asyncio.create_task(run_telemetry_simulation())
        asyncio.create_task(redis_listener())

        # Evaluate maintenance dates and dispatch initial alerts on startup
        try:
            from app.tasks.maintenance import check_maintenance_alerts
            status_msg = check_maintenance_alerts()
            print(f"[Startup Maintenance Check] {status_msg}")
        except Exception as e:
            print(f"[Startup Maintenance Check] Notice: {e}")

    return app


app = create_app()