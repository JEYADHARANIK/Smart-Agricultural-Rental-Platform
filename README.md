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
- **Nodemon** - Development live reload

### Frontend (`client/`)
- **React.js** (`^19.2.7`) & **Vite** (`^8.1.1`) - UI framework & build tool
- **React Router DOM** - Client-side routing & protected routes
- **Axios** - HTTP client with request interceptors for JWT Bearer token
- **Tailwind CSS** (`v4`) & **Lucide React** - Modern agricultural tech UI design & icons

---

## Current Features (Phase 1 Foundation)

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
   - **Admin Dashboard**: Operational console, fleet metric cards (Total Equipment, Available Equipment, Pending Bookings, Active Rentals), and system status
   - **Placeholder Views**: Equipment Catalog, Bookings Queue, Customer Directory

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
```

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

## Planned Future Modules (Phase 2 & Beyond)

1. **Equipment Fleet Management**:
   - Full CRUD operations for equipment listings
   - Image upload, pricing tiers, specifications, and GPS location tagging

2. **Booking & Rental Engine**:
   - Interactive date range calendar picker
   - Real-time availability check to prevent double-booking
   - Admin approval / rejection workflows & status updates

3. **Smart Scheduling & Weather-Aware Planning**:
   - Weather forecast API integration for rain & soil condition alerts
   - Optimized equipment dispatch scheduling

4. **Predictive Maintenance & Billing**:
   - Machine hour logging and service alert triggers
   - Invoicing, payment gateway integration, and transaction history