# FleetFlow 🚚💨 — Operations Control Center & Logistics Suite

FleetFlow is a state-of-the-art, premium glassmorphic fleet management and logistics dispatch suite. It is designed with a cyber-HUD aesthetic featuring real-time map telemetry, role-restricted fleet logistics coordination, and top-tier security gateways.

---

## 🌟 Key Features

### 1. Cyber-HUD Portal & Gateway
* **Visual Starry Sky Canvas:** Slow-drifting React canvas stars that twinkle and react dynamically to mouse proximity.
* **Vector Ridge Silhouettes:** Layers of vector ridge paths and procedurally mapped pine trees rising from the bottom viewport borders.
* **Responsive Corner Headers:** Centered brand typography on mobile, shifting to a floating top-left global header on desktop to keep authentication cards compact and clean.

### 2. Stepped Up Signup Security
* **Live Password Security Diagnostic:** Real-time criteria analyzer highlighting rules in **green (`✓`)** when satisfied or **red (`✗`)** when missing.
* **Integrity Matching:** Confirm Password pill inputs protecting credentials mismatch failures.
* **Double-Verification OTP Gate:** Once credentials pass verification, the cards transition into an OTP screen:
  * Generates a 6-digit key (logged in browser console).
  * **Real SMTP Emailing:** Sends a custom-styled HTML verification email to the user's inbox.
  * **Developer Fallbacks:** Falls back gracefully to offline mode with warning toasts if SMTP credentials are left blank in `.env`.
  * **Redirect to Login:** Once verified, users are routed to `/login` to sign in manually, reinforcing secure entry.

### 3. JWT Access & Refresh Token Lifecycle
* **Dual Tokens:** Issues a short-lived `access_token` (1 hour) and a long-lived `refresh_token` (7 days).
* **Silent Token Refresher:** Incorporates an Axios response interceptor that catches `401 Unauthorized` statuses, calls `/auth/refresh` silently to rotate tokens, and retries the original request seamlessly.
* **Secure Profile Purging:** Users can click **Delete Account** in their profile footer, executing database purges via `DELETE /auth/me` and logging out safely.

### 4. Custom Toast Notification Framework
* Lightweight, React 19-native notification manager context (`ToastContext.jsx`) handling alerts:
  * **Top-Right positioning** with smooth slide-in animations.
  * **Status Styles:** Success (green), Error (red), Warning (amber), and Info (cyan) styles.
  * Shortened **3-second automatic fade** for snappier feedback.

### 5. Control Center Dashboard
* **Dynamic Sidebar Navigation:** Sidebar display containing operator profiles, latency indicators, and role clearance tags (`ADMIN`, `MANAGER`, `DISPATCHER`, `DRIVER`).
* **Telemetry Map Tracker:** Interactive vector map showing animated GPS vehicle dots traveling along highways, with hover details and clickable depot terminals (SF, Oakland, San Jose, Sacramento, Fresno, LA).
* **Fleet Panel:** CRUD registry to view and provision vehicles (Tesla Semis, Freightliners, Kenworths). Forms are hidden for `DRIVER` accounts.
* **Trips Panel:** Dispatch new shipping manifests and assign drivers/vehicles.
* **Maintenance Logs:** File incidents and schedule maintenance. Drivers file "Pending" requests, while managers/admins review and schedule them.

---

## 📂 Project Structure

```
fleetflow/
├── backend/
│   ├── app/
│   │   ├── core/            # security.py (JWT), deps.py (dependencies)
│   │   ├── crud/            # Database queries
│   │   ├── models/          # SQLAlchemy schemas
│   │   ├── routers/         # auth.py (auth endpoints), vehicles.py
│   │   ├── schemas/         # Pydantic validation models
│   │   ├── utils/           # mail.py (SMTP emailing)
│   │   ├── config.py        # Environmental setting load_dotenv()
│   │   ├── database.py      # PostgreSQL connection engine
│   │   └── main.py          # FastAPI application startup
│   ├── alembic/             # Migration versions
│   ├── .env                 # Database & SMTP environment configurations
│   ├── requirements.txt     # Python requirements dependencies
│   └── venv/                # Local Python virtual environment
└── frontend/
    ├── src/
    │   ├── api/             # axios.js (token interceptors)
    │   ├── components/      # UI components (Dashboard, Forms, Map)
    │   ├── context/         # AuthContext.jsx, ToastContext.jsx
    │   ├── pages/           # Login.jsx, Signup.jsx, Dashboard.jsx
    │   ├── routes/          # ProtectedRoute.jsx
    │   ├── App.jsx          # Providers & Route coordinate maps
    │   └── index.css        # Twinkling star grids, keyframes
    ├── package.json         # Node dependencies
    └── vite.config.js       # Vite bundler configs
```

---

## 🛠️ Installation & Setup

### Prerequisites
* **Python 3.10+**
* **Node.js 18+**
* **PostgreSQL 14+**

---

### Backend Configuration

1. **Navigate to backend root:**
   ```bash
   cd backend
   ```

2. **Activate the Virtual Environment:**
   * **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   * **Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Environment Variables:**
   Create a `.env` file in `backend/` and configure:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/fleetflow_db
   SECRET_KEY=your_secure_jwt_secret_key_string
   ALGORITHM=HS256
   ACCESS_TOKEN_EXPIRE_MINUTES=60

   # SMTP Secure Mail Routing (For Gmail & Google App Passwords)
   SMTP_USER=your_email@gmail.com
   SMTP_PASSWORD=your_16_character_app_password
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   ```

5. **Initialize Database:**
   Ensure PostgreSQL is running, create the `fleetflow_db` database, and run Alembic migrations:
   ```bash
   alembic upgrade head
   ```

6. **Launch the FastAPI Server:**
   ```bash
   uvicorn app.main:app --reload
   ```
   * Interactive docs run at: `http://localhost:8000/docs`

---

### Frontend Configuration

1. **Navigate to frontend folder:**
   ```bash
   cd ../frontend
   ```

2. **Install Node Packages:**
   ```bash
   npm install
   ```

3. **Launch the Development Server:**
   ```bash
   npm run dev
   ```
   * Portal runs at: `http://localhost:5173`

---

## 🔒 API Specifications

### Authorization Endpoints

| Method | Endpoint | Description | Payload |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/signup` | Registers a new operator account | `{ full_name, email, password, role }` |
| **POST** | `/auth/login` | Returns short access token + long refresh token | `{ email, password }` |
| **POST** | `/auth/refresh` | Decodes refresh token and issues rotated tokens | `{ refresh_token }` |
| **POST** | `/auth/send-otp` | Pre-checks email duplicate and dispatches SMTP key | `{ email, otp }` |
| **GET** | `/auth/me` | Fetches active profile statistics (Protected) | *Bearer Access Token* |
| **DELETE**| `/auth/me` | Deletes user credentials & logs out (Protected) | *Bearer Access Token* |

---

## 👥 Roles & Access Levels
* **ADMIN:** Complete system override, fleet provision, maintenance scheduling, and dispatch permissions.
* **FLEET MANAGER:** Depot/vehicle clearance registries, maintenance log review, and logistics assignments.
* **DISPATCHER:** Route telemetry checks, vehicle assignation, and shipping manifest dispatching.
* **DRIVER:** Restrained logbook interface. Cannot register vehicles or dispatch trips. Can report vehicle maintenance faults (marked as "Pending").
