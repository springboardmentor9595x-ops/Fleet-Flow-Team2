from sqlalchemy import text
from app.database import engine, Base
from app.models import user, driver, vehicle, shipment, trip, gps_tracking, maintenance, fuel_record, notification, attendance

def reset():
    print("Purging database schema...")
    with engine.connect() as conn:
        # Commit any pending transactions first
        conn.execute(text("commit"))
        # Drop public schema cascade
        conn.execute(text("DROP SCHEMA IF EXISTS public CASCADE"))
        # Recreate public schema
        conn.execute(text("CREATE SCHEMA public"))
        # Grant permissions
        conn.execute(text("GRANT ALL ON SCHEMA public TO public"))
        conn.execute(text("commit"))
    
    print("Recreating database tables with current schema columns...")
    Base.metadata.create_all(bind=engine)
    print("Database schema synchronization complete!")

if __name__ == "__main__":
    reset()
