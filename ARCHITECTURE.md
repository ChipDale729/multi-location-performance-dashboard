# Architecture Notes

## 1. Tenancy Model

**Multi-Tenant on Single Database**
- All tables indexed by `orgId`; demo uses 1 org but code supports many
- Access control via `getPermittedLocationIds(user)`:
  - **ADMIN**: Returns `null` (can access all locations)
  - **MANAGER/VIEWER**: Returns array of assigned locationIds
  - All queries filtered by this and returns 403 on out-of-scope access

**Data Isolation**
- `LocationAccess` join table maps users → locations
- Admins have no explicit rows (implicitly all locations)
- Managers/viewers have explicit rows per assigned location
- Every table has `orgId` FK; all endpoints verify org ownership

**User Roles**
- **ADMIN**: Full org access, manage users/locations, upload CSV, assign action items
- **MANAGER**: Scoped to assigned locations, upload CSV (scoped), assign action items
- **VIEWER**: Read-only access to assigned locations only

---

## 2. Rollups & Aggregations

**Two-Stage Process**
1. **Ingest**: Events stored in `MetricEvent` table with deterministic `eventId = ${locationId}|${metricType}|${timestamp}` (idempotent via unique constraint)
2. **Aggregate**: Call `POST /api/rollups/process` to compute daily rollups

**Rollup Computation**
- Query `RollupRecomputeQueue` to find date ranges needing updates
- For each (orgId, locationId, metricType, date):
  - Filter events from `MetricEvent`
  - Compute 7-day rolling average and prior-week comparison
  - Insert/update `DailyMetricRollup` row
- Rank locations by metric for dashboard tiles


---

## 3. Scaling Considerations

**Horizontal App Scaling**
- Stateless Next.js instances behind load balancer
- Auto-scale based on request rate

**Database Scaling**
- PostgreSQL with indexed queries on (orgId, locationId, metricType, timestamp)
- For many locatiosn and metric events,
  - Partition `MetricEvent` by month
  - Use read replicas for dashboard queries
  - Archive data >1 year to cold storage

**Async Processing**
- Rollup job currently synchronous (~30 sec for 8 locations)
- For more locations, add job queue to process rollups in parallel

**Multi-Org Deployment**
- **Current**: Single org, single DB (simplicity)
- **Option A (Shared DB)**: Keep single DB, add multiple orgs; queries filter by orgId (supports 100+ orgs, no code changes)
- **Option B (Database-per-Org)**: Separate RDS per org for guaranteed isolation (enterprise)

---

## Key Design Decisions

1. **Deterministic Event IDs**: `eventId = ${locationId}|${metricType}|${timestamp}` enables idempotent ingestion (safe re-uploads)
2. **RollupRecomputeQueue**: Tracks affected dates when metrics ingested, which avoids full table recalculation
3. **Filter-Based Isolation**: All queries filtered by orgId + locationId; no app-level routing needed for tenancy
4. **Pre-Computed Rollups**: Dashboard queries are fast (vs. computing on-the-fly from raw events)
