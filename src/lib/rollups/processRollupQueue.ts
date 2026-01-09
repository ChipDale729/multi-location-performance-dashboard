import { prisma } from '@/lib/db';
import { recomputeAndDetect } from '@/lib/rollups/recomputeDailyRollups';

export async function processRollupQueueOnce(params?: { orgId?: string }) {
  const job = params?.orgId
    ? await prisma.rollupRecomputeQueue.findUnique({ where: { orgId: params.orgId } })
    : await prisma.rollupRecomputeQueue.findFirst();

  if (!job) return { ran: false };

  const { orgId, minDate, maxDate } = job;

  const { upserted } = await recomputeAndDetect({
    orgId,
    startDate: minDate,
    endDate: maxDate,
  });

  await prisma.rollupRecomputeQueue.deleteMany({
    where: { orgId, minDate, maxDate },
  });

  return { ran: true, orgId, upserted };
}
