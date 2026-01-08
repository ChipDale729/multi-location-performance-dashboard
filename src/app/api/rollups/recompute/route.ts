import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { recomputeDailyRollups } from '@/lib/rollups/recomputeDailyRollups';

export async function POST() {
  try {
    const user = getCurrentUser();

    // Only admins/managers can trigger recompute
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find pending rollup jobs for this org
    const jobs = await prisma.rollupRecomputeQueue.findMany({
      where: { orgId: user.orgId },
    });

    if (jobs.length === 0) {
      return NextResponse.json({
        message: 'No pending rollup jobs',
        processed: 0,
        upserted: 0,
      });
    }

    let totalUpserted = 0;

    // Process each job
    for (const job of jobs) {
      const result = await recomputeDailyRollups({
        orgId: job.orgId,
        startDate: job.minDate,
        endDate: job.maxDate,
      });

      totalUpserted += result.upserted;

      // Delete the job after successful processing
      await prisma.rollupRecomputeQueue.delete({
        where: { orgId: job.orgId },
      });
    }

    return NextResponse.json({
      message: 'Rollups recomputed successfully',
      processed: jobs.length,
      upserted: totalUpserted,
    });
  } catch (error) {
    console.error('Rollup recompute failed:', error);
    return NextResponse.json(
      { error: 'Rollup recompute failed' },
      { status: 500 }
    );
  }
}
