# GeoTracker

A modern, full-stack attendance tracking system with geofence validation, role-based access control, and rich analytics.

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Getting Started](#-getting-started)
- [⚙️ Environment Variables](#️-environment-variables)
- [📡 API Documentation](#-api-documentation)
- [🗄️ Database Schema](#️-database-schema)
- [🐳 Docker Setup](#-docker-setup)
- [📝 Development Guide](#-development-guide)


---

## ✨ Features

### 👨‍💼 Admin Features
- Comprehensive dashboard with real-time attendance overview
- Employee management (add/remove users)
- Geofence configuration for each employee
- Leave request approval/rejection workflow
- Working hours analytics and reports
- Calendar view for any employee with leave indicators
- CSV export of attendance data

### 👷 Employee Features
- One-click check-in/check-out with GPS verification
- Automatic geofence validation (must be within designated area)
- Personal attendance calendar with leave tracking
- Daily working hours display
- Leave request submission (casual, medical, other)
- Attendance history and monthly summaries
- Real-time status feedback

---

## 🏗️ Architecture

GeoTracker follows a **client-server architecture** with clear separation of concerns:

```
┌─────────────────┐    HTTP/REST    ┌─────────────────┐
│   React SPA     │───────────────▶│   Spring Boot   │
│   (Frontend)    │◀───────────────│   (Backend)     │
│                 │   JWT Auth      │                 │
│  • Components   │                │  • Controllers  │
│  • Services     │                │  • Services     │
│  • Hooks        │                │  • Repositories │
└─────────────────┘                │  • Security     │
                                   │  • DTOs         │
                                   └────────┬────────┘
                                            │
                          ┌─────────────────┴─────────────────┐
                          │                                   │
                          ▼                                   ▼
               ┌─────────────────┐                  ┌─────────────────┐
               │   PostgreSQL    │                  │     Redis       │
               │   (Database)    │                  │    (Cache)      │
               └─────────────────┘                  └─────────────────┘
```

**Frontend** communicates with backend via RESTful APIs using JWT tokens for authentication.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **React Leaflet** - Interactive maps with Leaflet
- **Axios** (via fetch) - HTTP client

### Backend
- **Spring Boot 3.2** - Java framework
- **Java 17** - Programming language
- **Spring Security** - Authentication & authorization
- **Spring Data JPA** - Database ORM
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **Maven** - Dependency management
- **Lombok** - Boilerplate reduction

---

## 📁 Project Structure

```
geotracker/
├── GeoTracker-Demo/          # Frontend React application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── EmployeeDashboard.tsx
│   │   │   ├── AttendanceCalendar.tsx
│   │   │   ├── WorkingHours.tsx
│   │   │   ├── MapDisplay.tsx
│   │   │   └── icons/
│   │   ├── services/         # API service layer
│   │   │   ├── apiService.ts
│   │   │   └── exportService.ts
│   │   ├── hooks/            # Custom React hooks
│   │   │   └── useGeolocation.ts
│   │   ├── types.ts          # TypeScript interfaces
│   │   ├── constants.ts      # App constants
│   │   └── index.tsx         # Entry point
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── backend/                  # Spring Boot backend
│   ├── src/main/java/com/geotracker/
│   │   ├── controller/       # REST controllers
│   │   │   ├── AuthController.java
│   │   │   ├── AttendanceController.java
│   │   │   ├── LeaveController.java
│   │   │   ├── UserController.java
│   │   │   └── GeofenceController.java
│   │   ├── service/          # Business logic
│   │   │   ├── UserService.java
│   │   │   ├── AttendanceService.java
│   │   │   └── LeaveService.java
│   │   ├── repository/       # Data access layer
│   │   │   ├── UserRepository.java
│   │   │   ├── AttendanceRepository.java
│   │   │   └── LeaveRepository.java
│   │   ├── entity/           # JPA entities
│   │   │   ├── User.java
│   │   │   ├── AttendanceRecord.java
│   │   │   ├── Leave.java
│   │   │   └── Geofence.java
│   │   ├── dto/              # Data transfer objects
│   │   ├── security/         # JWT & auth config
│   │   │   ├── JwtService.java
│   │   │   └── JwtAuthenticationFilter.java
│   │   └── config/           # App configuration
│   │       ├── SecurityConfig.java
│   │       └── DataInitializer.java
│   ├── src/main/resources/
│   │   ├── application.yml   # Configuration
│   │   └── data.sql          # Seed data
│   ├── pom.xml
│   └── Dockerfile
│
├── docker-compose.yml        # Full-stack Docker orchestration
└── README.md                 # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Java 17** (JDK)
- **Maven** or **Maven Wrapper**
- **Docker & Docker Compose** (optional, for containerized setup)
- **Git**

### Option 1: Docker Compose for Database (Recommended for Local Dev)

Use Docker Compose to start PostgreSQL and Redis:

```bash
# Clone the repository
git clone https://github.com/your-username/geotracker.git
cd geotracker

# Start PostgreSQL and Redis only
docker-compose up -d

# Frontend and Backend need to be started manually (see below)
```

To stop: `docker-compose down`

### Option 2: Manual Setup (Database on Docker, App Locally)

#### Step 1: Start Database Services (PostgreSQL & Redis)

Choose one option:

**Option A - Using Docker Compose:**
```bash
cd /usr/projects/Geotracker
docker-compose up -d
```

**Option B - Using Docker Run directly:**
```bash
docker run -d \
  --name geotracker-db \
  -e POSTGRES_DB=geotracker \
  -e POSTGRES_USER=geotracker \
  -e POSTGRES_PASSWORD=geotracker \
  -p 5432:5432 \
  postgres:16-alpine

docker run -d \
  --name geotracker-cache \
  -p 6379:6379 \
  redis:7-alpine
```

#### Step 2: Backend Setup

```bash
cd backend

# Configure environment (update application.yml if needed)
# Default settings connect to localhost:5432 for PostgreSQL and localhost:6379 for Redis

# Build and run with Maven
./mvnw spring-boot:run
# or if mvnw not available:
mvn spring-boot:run

# Backend will be available at http://localhost:8080
# API base URL: http://localhost:8080/api
```

#### Step 3: Frontend Setup

```bash
cd GeoTracker-Demo

# Install dependencies
npm install

# Configure API URL
# Create .env file with: VITE_API_URL=http://localhost:8080/api
# (or update constants.ts to point to your backend URL)

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

---

## ⚙️ Environment Variables

### Backend (`backend/src/main/resources/application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/geotracker
    username: geotracker
    password: geotracker
  redis:
    host: localhost
    port: 6379

jwt:
  secret: your-256-bit-secret-key-here-change-in-production
  expiry: 86400000 # 24 hours in milliseconds
```

### Frontend (`.env` in GeoTracker-Demo)

```
VITE_API_URL=http://localhost:8080/api
```

---

## 📡 API Documentation

All endpoints are prefixed with `/api`. Authentication uses JWT Bearer tokens.

### Auth
| Method | Endpoint      | Description                    |
|--------|---------------|--------------------------------|
| POST   | `/auth/login` | User login (returns JWT)       |
| POST   | `/auth/register-admin` | Create admin user   |

### Attendance
| Method | Endpoint                      | Description                 |
|--------|-------------------------------|-----------------------------|
| POST   | `/attendance/check-in`        | Mark check-in               |
| POST   | `/attendance/check-out`       | Mark check-out              |
| GET    | `/attendance/me`              | Get my attendance records   |
| GET    | `/attendance/summary`         | Monthly summary             |
| GET    | `/attendance/employee/{id}`   | Get employee's attendance   |
| GET    | `/attendance/export/csv`      | Export to CSV (admin only)  |

### Users
| Method | Endpoint        | Description                 |
|--------|-----------------|-----------------------------|
| GET    | `/users`        | List all users (admin)      |
| POST   | `/users`        | Create user (admin)         |
| DELETE| `/users/{id}`   | Delete user (admin)         |
| PUT    | `/users/{id}/geofence` | Set geofence          |

### Leaves
| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/leaves`             | All leaves (admin)           |
| GET    | `/leaves/my`          | My leaves (employee)         |
| POST   | `/leaves`             | Request leave                |
| PUT    | `/leaves/{id}/approve`| Approve leave (admin)        |
| PUT    | `/leaves/{id}/reject` | Reject leave (admin)         |

---

## 🗄️ Database Schema

### Users
```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'EMPLOYEE',
    geofence JSONB, -- { center: { latitude, longitude }, radius: number }
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Attendance Records
```sql
CREATE TABLE attendance_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    check_in_time TIMESTAMP NOT NULL,
    check_out_time TIMESTAMP,
    check_in_location JSONB, -- { latitude, longitude }
    check_out_location JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Leaves
```sql
CREATE TABLE leaves (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    type VARCHAR(20) NOT NULL, -- CASUAL, MEDICAL, OTHER
    status VARCHAR(20) NOT NULL, -- PENDING, APPROVED, REJECTED
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🐳 Docker Setup

The provided `docker-compose.yml` is configured to run only the database services (PostgreSQL and Redis). This allows developers to quickly spin up the database layer while running the frontend and backend locally for development.

To run the entire stack in Docker, you would need to create an extended `docker-compose.override.yml` or modify the existing file to include backend and frontend services with proper `build` contexts and environment configurations.

---

## 📝 Development Guide

### Adding a New API Endpoint

1. **Backend**: Create DTO → Service method → Controller mapping
2. **Frontend**: Add method in `apiService.ts` → Use in components

### Code Style

- **Frontend**: Follow existing React/TypeScript patterns. Use functional components and hooks.
- **Backend**: Use Lombok to reduce boilerplate. Follow Spring Boot conventions.




