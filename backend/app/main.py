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

from app.routers import auth, vehicles, trips, websockets, shipments, drivers, maintenance


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
    app.include_router(vehicles.router, prefix="/vehicles", tags=["Vehicles"])
    app.include_router(drivers.router, prefix="/drivers", tags=["Drivers"])
    app.include_router(trips.router, prefix="/trips", tags=["Trips"])
    app.include_router(shipments.router, prefix="/shipments", tags=["Shipments"])
    app.include_router(maintenance.router, prefix="/maintenance", tags=["Maintenance"])
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
        
        # Start WebSocket telemetry background simulation loop and Redis Pub/Sub listener
        from app.routers.websockets import run_telemetry_simulation, redis_listener
        asyncio.create_task(run_telemetry_simulation())
        asyncio.create_task(redis_listener())

    return app


app = create_app()