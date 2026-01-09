-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('REVENUE', 'ORDERS', 'FOOTFALL', 'DOWNTIME_MINUTES', 'UNITS_PRODUCED', 'TICKETS_OPENED', 'TICKETS_CLOSED');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('API', 'CSV', 'SEED');

-- CreateEnum
CREATE TYPE "ActionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricEvent" (
    "eventId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "source" "MetricSource" NOT NULL,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "Anomaly" (
    "id" SERIAL NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "actionItemId" INTEGER,

    CONSTRAINT "Anomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionItem" (
    "id" SERIAL NOT NULL,
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ActionStatus" NOT NULL DEFAULT 'OPEN',
    "metricType" "MetricType",
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigneeUserId" TEXT,

    CONSTRAINT "ActionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMetricRollup" (
    "orgId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "avg7" DOUBLE PRECISION,
    "prior7Avg" DOUBLE PRECISION,

    CONSTRAINT "DailyMetricRollup_pkey" PRIMARY KEY ("orgId","locationId","date","metricType")
);

-- CreateTable
CREATE TABLE "RollupRecomputeQueue" (
    "orgId" TEXT NOT NULL,
    "minDate" TIMESTAMP(3) NOT NULL,
    "maxDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RollupRecomputeQueue_pkey" PRIMARY KEY ("orgId")
);

-- CreateTable
CREATE TABLE "LocationAccess" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,

    CONSTRAINT "LocationAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Location_orgId_idx" ON "Location"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_orgId_idx" ON "User"("orgId");

-- CreateIndex
CREATE INDEX "MetricEvent_orgId_idx" ON "MetricEvent"("orgId");

-- CreateIndex
CREATE INDEX "MetricEvent_locationId_idx" ON "MetricEvent"("locationId");

-- CreateIndex
CREATE INDEX "MetricEvent_timestamp_idx" ON "MetricEvent"("timestamp");

-- CreateIndex
CREATE INDEX "Anomaly_orgId_idx" ON "Anomaly"("orgId");

-- CreateIndex
CREATE INDEX "Anomaly_locationId_idx" ON "Anomaly"("locationId");

-- CreateIndex
CREATE INDEX "Anomaly_detectedAt_idx" ON "Anomaly"("detectedAt");

-- CreateIndex
CREATE INDEX "Anomaly_status_idx" ON "Anomaly"("status");

-- CreateIndex
CREATE INDEX "ActionItem_orgId_idx" ON "ActionItem"("orgId");

-- CreateIndex
CREATE INDEX "ActionItem_locationId_idx" ON "ActionItem"("locationId");

-- CreateIndex
CREATE INDEX "ActionItem_status_idx" ON "ActionItem"("status");

-- CreateIndex
CREATE INDEX "ActionItem_timestamp_idx" ON "ActionItem"("timestamp");

-- CreateIndex
CREATE INDEX "DailyMetricRollup_orgId_date_idx" ON "DailyMetricRollup"("orgId", "date");

-- CreateIndex
CREATE INDEX "DailyMetricRollup_locationId_date_idx" ON "DailyMetricRollup"("locationId", "date");

-- CreateIndex
CREATE INDEX "RollupRecomputeQueue_minDate_idx" ON "RollupRecomputeQueue"("minDate");

-- CreateIndex
CREATE INDEX "RollupRecomputeQueue_maxDate_idx" ON "RollupRecomputeQueue"("maxDate");

-- CreateIndex
CREATE INDEX "LocationAccess_orgId_idx" ON "LocationAccess"("orgId");

-- CreateIndex
CREATE INDEX "LocationAccess_locationId_idx" ON "LocationAccess"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationAccess_userId_locationId_key" ON "LocationAccess"("userId", "locationId");

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_actionItemId_fkey" FOREIGN KEY ("actionItemId") REFERENCES "ActionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Anomaly" ADD CONSTRAINT "Anomaly_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_assigneeUserId_fkey" FOREIGN KEY ("assigneeUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionItem" ADD CONSTRAINT "ActionItem_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetricRollup" ADD CONSTRAINT "DailyMetricRollup_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMetricRollup" ADD CONSTRAINT "DailyMetricRollup_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RollupRecomputeQueue" ADD CONSTRAINT "RollupRecomputeQueue_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAccess" ADD CONSTRAINT "LocationAccess_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAccess" ADD CONSTRAINT "LocationAccess_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationAccess" ADD CONSTRAINT "LocationAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
