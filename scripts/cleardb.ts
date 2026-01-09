import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$transaction([
    prisma.dailyMetricRollup.deleteMany(),
    prisma.rollupRecomputeQueue.deleteMany(),
    prisma.metricEvent.deleteMany(),
    (prisma as any).anomaly.deleteMany(),
    prisma.actionItem.deleteMany(),
    prisma.user.deleteMany(),
    prisma.location.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  console.log('cleared all tables');
}

main()
  .catch((e) => {
    console.error('failed to clear db', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
