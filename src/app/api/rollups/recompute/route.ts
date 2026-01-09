import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recomputeAndDetect } from '@/lib/rollups/recomputeDailyRollups';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    // Only admins/managers can trigger recompute
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Optional body to set date range; default to last 14 days
    const body = await request.json().catch(() => ({}));
    const endDate = body?.endDate ? new Date(body.endDate) : new Date();
    const startDate = body?.startDate
      ? new Date(body.startDate)
      : new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Immediately recompute and detect anomalies for provided range
    const { upserted } = await recomputeAndDetect({
      orgId: user.orgId,
      startDate,
      endDate,
    });

    return NextResponse.json({
      message: 'Rollups recomputed',
      upserted,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error('Rollup recompute failed:', error);
    return NextResponse.json(
      { error: 'Rollup recompute failed' },
      { status: 500 }
    );
  }
}
