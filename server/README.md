# SharePlate Backend API & Persistent Persistence Engine

SharePlate is an algorithmic surplus-food rescue platform connecting college canteens, hostel messes, restaurants, and event organizers with verified NGOs and community kitchens.

---

## 🚀 Quick Start (Windows PowerShell)

### Run the Backend Server
```powershell
cd E:\SharePlate\server
npm start
```
The server starts listening on `http://localhost:5000`.

### Run Automated Tests (57 Tests)
```powershell
# From root
cd E:\SharePlate
npm test

# Or within server/
cd E:\SharePlate\server
npm test
```

---

## 🛠️ Architecture & Database Design

```
server/
├── auth.js                # Bcrypt password hashing & SQLite session management
├── prisma/
│   ├── schema.prisma      # Declarative relational schema with ACID models
│   ├── db.js              # Prisma Client & Audit/Notification helpers
│   └── seed.js            # Database migration from JSON to SQLite
├── engines/
│   ├── priorityScore.js   # Innovation 1: Rescue Priority Score (0-100) + Safety Gate
│   ├── smartMatcher.js    # Innovation 2: Smart Recipient Matcher (Illustrative distance tags)
│   ├── splitMatcher.js    # Innovation 3: Split-and-Match Engine (Portion conservation)
│   └── recoveryEngine.js  # Innovation 4: Failed-Pickup Recovery & Safety Audit
├── tests/
│   ├── algorithms.test.js        # Unit tests for the 4 core mathematical & safety engines
│   ├── api.test.js               # REST API endpoint tests with isolated test-db.json
│   └── auth-and-upgrades.test.js # Authentication, RBAC, notifications & moderation tests
└── server.js              # Express REST API routes & Handshake controller
```

---

## 📡 Key REST API Endpoints

### 1. Authentication & Sessions
- `POST /api/auth/signup`: Create Donor or Recipient account.
- `POST /api/auth/login`: Authenticate with bcrypt hash and establish HttpOnly session cookie.
- `POST /api/auth/logout`: Destroy session and clear cookie.
- `GET /api/auth/me`: Retrieve current profile and organization info.
- `PUT /api/auth/profile`: Update organization details, capacity, and hours.
- `PUT /api/auth/password`: Secure password change with verification.

### 2. Donations
- `GET /api/donations`: List donations (supports `?status=...&category=...&isVeg=...&search=...`). Masked verification codes for public viewers.
- `GET /api/donations/:id`: Retrieve single donation.
- `POST /api/donations`: Create donation with automatic Rescue Priority Score.
- `PUT /api/donations/:id`: Edit eligible donation (before portion allocation).
- `POST /api/donations/:id/cancel`: Cancel permitted donation.

### 3. Recipient Matching & Split-and-Match
- `GET /api/recipients`: List verified recipient organizations.
- `GET /api/donations/:id/matches`: Rank compatible recipients using smart matcher.
- `POST /api/donations/:id/claims`: Claim full or split portions. Atomic transaction prevents over-allocation.
- `POST /api/claims/:id/cancel`: Cancel claim and restore portion balance.

### 4. Verification & Recovery
- `POST /api/claims/:id/verify-pickup`: Verify physical collection using 6-character code (`SP-XXXXXX`).
- `POST /api/claims/:id/report-failed-pickup`: Trigger two-gate recovery engine.
- `GET /api/impact`: Impact aggregation from verified completed pickups.

### 5. In-App Notifications
- `GET /api/notifications`: Retrieve notifications with unread count.
- `PUT /api/notifications/:id/read`: Mark single notification as read.
- `PUT /api/notifications/read-all`: Mark all as read.

### 6. Administration & Moderation
- `GET /api/admin/stats`: Aggregated platform stats.
- `GET /api/admin/users`: List users and organizations.
- `PUT /api/admin/users/:id/status`: Suspend or restore user accounts.
- `GET /api/admin/incidents`: List food safety incidents.
- `POST /api/admin/incidents`: Report a safety incident.
- `PUT /api/admin/incidents/:id/resolve`: Resolve an incident with notes.
- `GET /api/admin/audit`: Full platform audit log.
