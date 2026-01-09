# Multi-Location Performance Dashboard

Multi-tenant SaaS platform for aggregating KPIs across locations with role-based dashboards, anomaly detection, and action item tracking.

## Setup
```bash
npm install

# .env.local
DATABASE_URL="postgresql://user:password@localhost:5432/dashboard_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

npx prisma migrate deploy
npm run dev  # http://localhost:3000
```

## Demo Users

| Email | Password | Role |
|-------|----------|------|
| `admin@org.com` | `password` | ADMIN |
| `manager@org.com` | `password` | MANAGER |
| `viewer@org.com` | `password` | VIEWER |

**Seed:** `curl -X POST http://localhost:3000/api/seed/run`

## Features

- **Multi-Tenant**: Organization → Locations → Users with role-based access
- **Metrics Ingestion**: API, CSV, or seed data; idempotent via deterministic event IDs
- **Daily Rollups**: Automated aggregations (sum, avg, min/max, 7-day averages)
- **Anomaly Detection**: Rule-based (40%+ drop from baseline); severity levels
- **Action Items**: Track issues linked to anomalies; assign to team members
- **Dashboards**: Global KPI tiles, location drill-down, trend charts, rankings
- **Admin Console**: Manage organizations, locations, users, roles

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for tenancy model, rollups, scaling.

## Testing

```bash
npm test  # Metrics ingestion, validation, rollups, anomaly detection
```

