# FleetFlow 🚚💨

**FleetFlow** is a modern, high-tech fleet operations control center and real-time telemetry routing dashboard. It enables logistics managers to schedule shipments, assign vehicles & drivers, track trips dynamically over a Leaflet GPS map, and send SMTP contractor notifications.

---

## 🛠️ Technology Stack
* **Backend:** FastAPI (Python), SQLAlchemy ORM (SQLite DB), Uvicorn, Python-SMTP.
* **Frontend:** React.js, Vite, Tailwind CSS, Leaflet Maps (React Leaflet).
* **Communication:** WebSockets for live GPS telemetry broadcast simulation.

---

## 🌟 Key Features & Updates

### 1. Real-time Telemetry & Map Radar
* **Auto-Focus Target:** Automatically identifies and tracks the latest dispatched trip route (`activeTrips[0]` due to descending ID sort), auto-zooming Leaflet map bounds to highlight the route path.
* **WebSocket Connection Guard:** Cleanly handles socket connection teardowns on component unmount to prevent duplicate geofence alerts and orphaned reconnection loops.

### 2. Automated Driver & Vehicle Status Lifecycle Sync
* **Pre-Assignment:** Creating or editing a shipment and allocating a driver/vehicle automatically sets their statuses to `Assigned` in the database.
* **Transit Departure:** Starting a trip transitions both the vehicle and driver status to `In Transit`.
* **Delivery Completion:** Completing a trip (via simulation arrival or manually) automatically resets the vehicle and driver status back to `Available`, making them immediately select-able for future dispatches.
* **Smart Dropdown Filters:** Trips and Shipment modals only list eligible `Available` or `Active` resources, while smartly preserving the currently allocated driver/vehicle so they auto-populate when linking active shipments.

### 3. SMTP Contractor Email Alerts
* **Contractor Configuration:** Dynamic Customer/Contractor Email input field embedded inside the Add and Edit Shipment forms.
* **HTML Mail Template Dispatch:** Dispatches beautiful, responsive HTML email status updates directly to contractors upon shipment transitions:
  * **Departure:** Sent when the vehicle starts the route.
  * **In Transit:** Sent during route checkpoints.
  * **Completed:** Sent upon safe arrival at the terminal.

### 4. Interactive Driver Console & Active Trip Panel
* **Active Trip Tab:** A dedicated console page for drivers that extracts their current scheduled or in-transit assignment.
* **One-Click Operations:** Drivers can easily click large action buttons to start a trip (`Depart Hub`) or complete it (`Confirm Safe Arrival`).
* **Role-Based Security:** In-transit trip status updates and recalculations are strictly restricted to the assigned driver on the API level. Managers can schedule and delete, but cannot override in-transit status.

### 5. Multi-Role Account Settings
* **Driver Profiles:** Interactive `Profile` panel that lets drivers view and edit their address, license number, and experience years.
* **Management Settings:** Interactive `Settings` panel for Admins, Fleet Managers, and Dispatchers to edit their full name and phone number.
* **Global Name Syncing:** Context-hooked to automatically refresh the user session and sync sidebar labels dynamically upon profile edits.

### 6. Clean HUD Layout Optimization
* **Live Tracking Only:** The telemetry HUD stats grid (Active Capacity, Dispatches count, Pending Incidents) is rendered strictly on the **Live Tracking** map dashboard. It is automatically hidden on all other tabs (Shipments, Vehicle, Trips, Maintenance, Settings, etc.) to keep panels tidy and focused.

---

## 🚀 Running the Project

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate      # On Windows
pip install -r requirements.txt
python run_server.py
```
* API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Dev server will run on `http://localhost:5173`.
