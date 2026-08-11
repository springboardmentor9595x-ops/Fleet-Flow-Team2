from app.crud.user import get_user_by_email, create_user
from app.crud.vehicle import get_vehicles, get_vehicle, get_vehicle_by_registration, create_vehicle, update_vehicle, delete_vehicle
from app.crud.trip import get_trips, get_trip, create_trip, update_trip_status, update_trip_coords, delete_trip
from app.crud.shipment import get_shipments, get_shipments_by_driver, get_shipment, create_shipment, update_shipment, delete_shipment, get_shipment_history

__all__ = [
    "get_user_by_email",
    "create_user",
    "get_vehicles",
    "get_vehicle",
    "get_vehicle_by_license",
    "create_vehicle",
    "update_vehicle",
    "delete_vehicle",
    "get_trips",
    "get_trip",
    "create_trip",
    "update_trip_status",
    "update_trip_coords",
    "delete_trip",
    "get_shipments",
    "get_shipments_by_driver",
    "get_shipment",
    "create_shipment",
    "update_shipment",
    "delete_shipment",
    "get_shipment_history",
]
