# Smart Agricultural Rental Platform

A modern MERN-stack web application designed for managing agricultural equipment rentals, connecting farmers (customers) with equipment owners/administrators. Features a role-based access architecture with JWT security, customer booking workflows, equipment fleet management, and clean responsive UI.

---

## Tech Stack

### Backend (`server/`)
- **Node.js** & **Express.js** (`^5.2.1`) - Server framework
- **MongoDB** & **Mongoose** (`^9.9.3`) - Database & object modeling
- **JWT (jsonwebtoken)** (`^9.0.3`) - Bearer token authentication & authorization
- **bcryptjs** (`^3.0.3`) - Password hashing
- **CORS** & **dotenv** - Cross-origin resource sharing & env configuration
- **@google/genai** - Optional Google Gemini ground for recommendations/assistant (falls back to deterministic rules without a key)
- **Node built-in test runner (`node:test`)** - Unit tests, no extra dependencies
- **Nodemon** - Development live reload

External integrations (all graceful-degrade): **OpenWeatherMap** (weather-aware
scheduling), **Razorpay** (payments), **Twilio** (optional SMS). See
[`docs/AI-and-Intelligent-Decision-Support.md`](docs/AI-and-Intelligent-Decision-Support.md).

### Frontend (`client/`)
- **React.js** (`^19.2.7`) & **Vite** (`^8.1.1`) - UI framework & build tool
- **React Router DOM** - Client-side routing & protected routes
- **Axios** - HTTP client with request interceptors for JWT Bearer token
- **Tailwind CSS** (`v4`) & **Lucide React** - Modern agricultural tech UI design & icons

---

## Current Features

1. **Authentication & User Management**:
   - Customer account registration (`POST /api/auth/register`)
   - Secure login & JWT token issue (`POST /api/auth/login`)
   - Profile verification endpoint (`GET /api/auth/me`)
   - Role-based distinction (`customer` vs `admin`)
   - Client-side registration validation & password security

2. **Role-Based Authorization & Routing**:
   - `AuthContext` with persistent JWT storage in `localStorage`
   - `ProtectedRoute` component enforcing role access controls
   - Auto-redirection: `customer` -> `/customer/dashboard`, `admin` -> `/admin/dashboard`

3. **User Dashboards & UI**:
   - **Landing Page (`Home`)**: Hero section, features, call-to-action, and "How It Works" process map
   - **Customer Dashboard**: Personal welcome banner, user profile info, and metric summary cards (Upcoming Bookings, Active Rentals, Pending Payments)
   - **Admin Dashboard**: Operational console, fleet metric cards (Total Equipment, Available Equipment, Pending Bookings, Active Rentals), analytics charts, and system status

4. **Equipment Fleet Management**: full CRUD, daily pricing, category/location tags, usage-hours & maintenance-interval tracking, availability status.

5. **Booking & Rental Engine**: date-range availability checks with double-booking protection, admin approval/rejection workflow, Razorpay checkout (simulated payment in test mode), notifications & optional SMS.

6. **Intelligent Decision Support** (see
   [`docs/AI-and-Intelligent-Decision-Support.md`](docs/AI-and-Intelligent-Decision-Support.md)):
   - **AI equipment recommendations** (`POST /api/ai/recommend-equipment`) — Gemini-grounded on live
     inventory when a key is configured, deterministic keyword/budget scoring otherwise. Every response
     reports its `mode` (`ai` | `rule-based`).
   - **Multilingual farmer assistant** (`POST /api/chatbot/chat`) — English/Tamil/Hindi/Kannada/Telugu/
     Malayalam; Gemini-grounded or rule-based offline replies from real catalog + the user's own bookings.
   - **Weather-aware scheduling** (`POST /api/scheduler/analyze`, `/alternatives`) — transparent
     `BEST`/`USABLE`/`NOT RECOMMENDED`/`UNKNOWN` classification from OpenWeatherMap, maintenance
     restrictions, and alternative recommendations with reasons.
   - **Predictive maintenance risk** (`GET /api/maintenance/equipment/:id/risk`) — explainable
     point-based `Low`/`Medium`/`High` scoring with per-factor breakdown and honest "insufficient data"
     when history is missing.
   - **Capability reporting** (`GET /api/ai/capabilities`) — runtime report of which path each
     feature is using.

7. **Admin modules**: customer directory, maintenance dashboard, notifications, analytics/revenue charts.

---

## Folder Structure

```
Smart-Agricultural-Rental-Platform/
├── client/                      # React + Vite Frontend
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js          # Axios instance with Bearer token interceptor
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Role-based responsive navigation
│   │   │   └── ProtectedRoute.jsx# Auth & role guard wrapper
│   │   ├── context/
│   │   │   └── AuthContext.jsx   # Auth state context provider
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Landing page
│   │   │   ├── Login.jsx         # Login form
│   │   │   ├── Register.jsx      # Customer registration
│   │   │   ├── CustomerDashboard.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── Equipment.jsx     # Equipment list placeholder
│   │   │   ├── Bookings.jsx      # Bookings queue placeholder
│   │   │   └── Customers.jsx     # Customer directory placeholder
│   │   ├── App.jsx               # Router & AuthProvider configuration
│   │   ├── index.css             # Tailwind CSS directives
│   │   └── main.jsx              # React entry point
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                      # Node.js + Express Backend
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   └── authController.js     # Register, Login, GetMe controllers
│   ├── middleware/
│   │   ├── authMiddleware.js     # JWT token verification
│   │   └── roleMiddleware.js     # Role check middleware
│   ├── models/
│   │   └── User.js               # Mongoose User schema & password hashing
│   ├── routes/
│   │   └── authRoutes.js         # Auth endpoints
│   ├── .env                      # Local environment secrets
│   ├── .env.example              # Environment template
│   ├── package.json
│   └── server.js                 # Express server entry & health check
│
├── docs/                        # Project documentation
├── assets/                      # Media assets
└── README.md
```

---

## Environment Variables

Create `.env` inside `server/` (refer to `server/.env.example`):

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/smart-agri-rental
JWT_SECRET=smart_agri_rental_jwt_secret_key_2026
GEMINI_API_KEY=your_gemini_api_key_here
OPENWEATHER_API_KEY=your_openweather_api_key_here
```

`GEMINI_API_KEY` and `OPENWEATHER_API_KEY` are optional — without them the AI
assistant/recommendations and weather classification degrade to deterministic,
fully-functional fallbacks (see the intelligence doc above).

---

## Installation & Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://localhost:27017` or MongoDB Atlas URI)

### 1. Install Backend Dependencies
```bash
cd server
npm install
```

### 2. Install Frontend Dependencies
```bash
cd client
npm install
```

---

## Running the Application

### How to Run Backend
```bash
cd server
npm run dev
# Server will run on http://localhost:5000
```

Health check verification:
`GET http://localhost:5000/api/health`

### How to Run Frontend
```bash
cd client
npm run dev
# Frontend app will run on http://localhost:5173
```

---

## API Documentation (Phase 1 Auth Routes)

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | Returns API health status |
| `POST` | `/api/auth/register` | Public | Registers a new Customer account |
| `POST` | `/api/auth/login` | Public | Authenticates user & returns JWT token |
| `GET` | `/api/auth/me` | Protected (JWT) | Retrieves current logged-in user details |

---

## Testing & Evaluation

```bash
# Backend unit tests (Node built-in runner)
cd server
npm test

# Deterministic evaluation of the intelligent decision-support logic
npm run evaluate

# Frontend build check
cd client
npm run build
```

## Module Status

| Module | Status |
|---|---|
| Auth, roles, customer & admin dashboards | Implemented |
| Equipment fleet management | Implemented |
| Booking & rental engine (approval, availability checks, automatic start/complete lifecycle) | Implemented |
| Smart scheduling & weather-aware planning | Implemented (see intelligence doc) |
| Predictive maintenance (usage logging, alerts, risk scoring) | Implemented |
| Billing, invoices/receipts & Razorpay payments (simulated in test mode) | Implemented |
| Multilingual AI farmer assistant | Implemented (Gemini + offline fallback) |
| Notifications & optional SMS | Implemented |