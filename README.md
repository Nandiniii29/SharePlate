# SharePlate 🍽️
### Good Food. Greater Impact.

**Turning surplus food into meals that matter.**

SharePlate is a food redistribution platform that helps food donors connect with organizations that can put surplus food to good use. It brings food listings, recipient matching, pickup coordination, and impact tracking into one place.

The idea is simple: **good food should reach people, not go to waste.**

## 🌍 The Problem

Canteens, hostel messes, restaurants, and catering services can have surplus food at the end of the day. Meanwhile, NGOs, shelters, and community kitchens need a reliable way to discover available food and arrange timely pickups.

Without proper coordination, food can go to waste even when a potential recipient is nearby.

SharePlate aims to bridge this gap through a single, organized platform.

## 💡 Our Solution

SharePlate connects donors and recipient organizations through a straightforward workflow:

1. **List surplus food** — Add food details, available portions, storage information, and pickup deadlines.
2. **Find suitable recipients** — Match donations with organizations based on their needs and availability.
3. **Allocate food efficiently** — Allow a large donation to be shared among multiple recipients.
4. **Coordinate and verify pickup** — Track collection and confirm successful handovers.
5. **Measure the impact** — Record rescued food and related impact metrics from verified pickups.

## ✨ What Makes SharePlate Different?

### 1. Urgency-Based Food Rescue
A priority-scoring engine helps identify donations that need faster action, taking factors such as perishability and deadlines into account. Food-safety checks are incorporated into the workflow.

### 2. Smarter Recipient Matching
The matching engine considers factors such as portion requirements, operating hours, and dietary compatibility to help identify suitable recipients.

### 3. Split Donations, Reach More People
A single donation does not have to go to just one organization. SharePlate supports partial allocations while tracking the remaining portions.

### 4. Recovery When a Pickup Fails
When a pickup cannot be completed, the recovery workflow can assess whether the donation remains eligible for reassignment. Food that is no longer suitable for redistribution can be recorded for composting.

### 5. Verified Handover and Impact Tracking
A private rescue code helps confirm a physical handover. Impact statistics are linked to verified pickups rather than simply counting listed donations.

Together, these features aim to make food redistribution more organized, accountable, and responsive.

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Database | SQLite, Prisma ORM |
| Authentication | Bcrypt password hashing, session-based authentication |
| Authorization | Role-based access control |
| Testing | Node.js test runner, Playwright |

## 🧪 Testing

The current project test suite includes **57 automated backend tests** and **15 Playwright UI tests**.

Testing covers areas such as matching logic, allocation, recovery workflows, API behavior, authentication, and selected user-interface flows.

The frontend production build has also been tested successfully.

These results describe the current test coverage; they do not guarantee that every possible real-world scenario has been tested.

## 🚀 Run SharePlate Locally

### Prerequisites
- Node.js 18 or later
- npm 9 or later

### 1. Clone the repository

```bash
git clone https://github.com/Nandiniii29/SharePlate.git
cd SharePlate
```

### 2. Install dependencies

```bash
npm install
```

If the root installation does not install the client and server dependencies, run:

```bash
cd server
npm install
cd ../client
npm install
cd ..
```

### 3. Configure the environment

Create `server/.env` using `server/.env.example` as a reference. Configure the database URL, frontend URL, port, and a unique session secret for your local environment.

Do not use development credentials or session secrets in a production deployment.

### 4. Set up the database

```bash
cd server
npx prisma db push
node prisma/seed.js
cd ..
```

Run the seed script only in a development database where its sample data is appropriate.

### 5. Start the application

```bash
npm run dev
```

When both development servers start successfully, open:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 6. Run tests and build

Run the automated test suite:

```bash
npm test
```

Run the frontend production build:

```bash
npm run build
```

For the UI tests, use the Playwright configuration and setup instructions included in the repository.

## 🔐 Security and Privacy

SharePlate includes several security-focused design choices:

- Passwords are hashed rather than stored as plain text.
- Sessions use HTTP-only cookies.
- Protected operations use role-based authorization.
- Private pickup verification codes are kept out of public donation listings.
- Administrative workflows support moderation of reported food-safety concerns.

The project is a hackathon prototype. Production use would require further security review, deployment hardening, and operational monitoring.

**Demo accounts:** If sample accounts are included in the seed script, use them only for local demonstrations. Never reuse their passwords or publish real credentials.

## ⚠️ Current Limitations

- Distance information is illustrative until reliable location data is integrated.
- External email and SMS notifications require an additional delivery provider.
- Production deployment requires HTTPS, secure cookie configuration, and appropriate server settings.
- SQLite is suitable for the current prototype; larger deployments may require a different database and deployment architecture.

## 🌱 Our Vision

We want to make surplus-food redistribution easier to coordinate, easier to trust, and easier to measure.

By bringing donors, recipient organizations, and pickup workflows together, SharePlate aims to help more usable food reach the people and communities that need it.

**Less waste. Better coordination. Greater impact.**

---

*Built by Team QuadraMind for a hackathon project.*
