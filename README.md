# SharePlate — Good Food. Greater Impact.

SharePlate is an enterprise-grade surplus-food rescue and redirection platform connecting food donors—such as university canteens, hostel messes, caterers, and restaurants—with recipient organizations—such as NGOs, shelters, and community kitchens.

---

## 🎨 Theme & Visual Identity (Theme 3)

SharePlate uses the **Sage Green + Warm Cream + Terracotta** palette:
- **Warm Cream & Soft Ivory (`#FDFBF7`, `#F7F3EC`)**: Primary body and canvas background.
- **Muted Sage Green (`#5B7A60`, `#48644C`)**: Primary brand identity, environmental metrics, and sustainability indicators.
- **Deep Forest-Charcoal (`#16221A`, `#1F2E23`)**: High-contrast typography and sticky navigation.
- **Restrained Terracotta (`#C45D3E`, `#A84A2E`)**: Primary call-to-actions, highlights, and urgency markers.
- **Accessible Indicators**: Emerald (`#10B981`) for verified status, Amber (`#F59E0B`) for pending, Rose (`#E11D48`) for safety alerts.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS 3.4 (Custom Theme 3 Tokens), Lucide Icons |
| **Backend** | Node.js, Express 4.21, Cookie-Parser, CORS |
| **Database & ORM** | SQLite, Prisma ORM 6.4 (ACID Transactions, Foreign Key Constraints, Safe Migrations) |
| **Security & Auth** | Bcrypt password hashing, Persistent SQLite Server Sessions (`HttpOnly`, `SameSite=lax` cookies), RBAC |
| **Testing** | Node.js native test runner (`node:test`, `node:assert/strict`) — 57 automated tests |

---

## 🧩 5 Core Platform Innovations

1. **Rescue Priority Score (RPS) Engine (`server/engines/priorityScore.js`)**
   - Evaluates logistical urgency (0–100) based on food perishability, storage environment, and safe consumption deadlines.
   - Enforces a mandatory **Food-Safety Gate**: uncertified batches or temperature danger zone abuse (5°C–60°C) are strictly blocked from listing.
2. **Smart Recipient Matcher (`server/engines/smartMatcher.js`)**
   - Matches donations to verified organizations by portion capacity, operating hours overlap, and dietary compatibility (e.g. strict vegetarian).
   - Distance tags are labeled as illustrative estimates.
3. **Split-and-Match Allocation (`server/engines/splitMatcher.js`)**
   - Allows multiple recipients to claim partial portions of large surplus batches.
   - Maintains the arithmetic invariant `allocatedPortions + remainingPortions === totalPortions` inside database transactions.
4. **Failed-Pickup Recovery Engine (`server/engines/recoveryEngine.js`)**
   - If a courier breaks down or fails to arrive, the system checks affirmative food safety and a minimum 45-minute dispatch buffer before secondary re-matching.
   - Compromised food is routed to an audited composting log.
5. **Verified Chain-of-Custody & Impact Ledger (`server/engines/`)**
   - Private 6-character rescue codes (`SP-XXXXXX`) must be entered by the donor to verify physical handover.
   - Impact metrics (meals rescued, kg diverted, CO₂e prevented, water saved) are aggregated **strictly from verified pickups**.

---

## 💻 Installation & Startup (Windows PowerShell)

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0

### 1. Install Dependencies
```powershell
cd E:\SharePlate
npm install
cd server
npm install
cd ../client
npm install
cd ..
```

### 2. Configure Environment Variables
Create `.env` inside `server/` (or copy from `.env.example`):
```env
PORT=5000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
SESSION_SECRET="shareplate_secure_session_secret_2026_production_key"
FRONTEND_URL="http://localhost:5173"
```

### 3. Initialize Database & Migrate Legacy JSON
```powershell
cd E:\SharePlate\server
npx prisma db push
node prisma/seed.js
cd ..
```

### 4. Run Development Servers (Concurrent)
```powershell
npm run dev
```
- **Frontend App**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`

---

## 🧪 Testing & Production Build

### Run the Full Test Suite (57 Automated Tests)
```powershell
npm test
```
*Executes all test suites:*
- RPS Engine unit tests
- Smart Matcher unit tests
- Split-and-Match allocation tests
- Failed-Pickup Recovery engine tests
- REST API & persistence test suite
- Authentication, roles, notifications & moderation test suite
- End-to-end live verification & QA suite

### Production Client Build
```powershell
npm run build
```
Generates production-optimized static assets in `client/dist/`.

---

## 🔐 Default Demonstration Accounts

The database seed initializes standard role accounts with genuine Bcrypt password hashes:

| Role | Email | Password | Organization |
| :--- | :--- | :--- | :--- |
| **Donor** | `hostel3@shareplate.org` | `Password123!` | Hostel 3 Mess Council |
| **Donor** | `dining@shareplate.org` | `Password123!` | Central Dining Services |
| **Recipient** | `robinhooda@shareplate.org` | `Password123!` | Robin Hood Army (Campus Chapter) |
| **Recipient** | `ashacommun@shareplate.org` | `Password123!` | Asha Community Kitchen & Shelter |
| **Administrator** | `admin@shareplate.org` | `AdminSecure2026!` | SharePlate Platform Administration |

*The Sign-In dialog also includes one-click demonstration login buttons.*

---

## 🛡️ Security & Privacy Architecture

- **Session Security**: Authenticated sessions are stored in the SQLite `Session` table and managed through `HttpOnly`, `SameSite=lax` cookies. No credentials, tokens, or session secrets are stored in `localStorage`.
- **Private Code Masking**: Rescue verification codes are removed from all public listings and single donation lookups. Codes are accessible only to the claiming recipient organization on their private pickup pass.
- **Role-Based Authorization**: Protected endpoints verify session roles (`DONOR`, `RECIPIENT`, `ADMIN`) before permitting write actions.
- **Incident Moderation**: Administrators can investigate food-safety reports and suspend accounts via `PUT /api/admin/users/:id/status`.

---

## ⚠️ Known Limitations & Deployment Requirements

1. **Production Cookies**: In production environments (HTTPS), set `secure: true` on cookies and configure reverse proxy headers (`trust proxy`).
2. **Multi-Region Scaling**: For multi-server clusters, replace SQLite with PostgreSQL by switching `provider = "postgresql"` in `prisma/schema.prisma`.
3. **Notification Delivery**: In-app notifications are stored persistently in the database. For external SMS or SMTP email delivery, configure an external provider (e.g. SendGrid or Twilio) using webhook handlers.
4. **Distance Calculations**: Proximity metrics are tagged as illustrative estimates until campus GIS mapping coordinates are integrated.
