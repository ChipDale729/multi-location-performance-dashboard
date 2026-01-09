import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { processRollupQueueOnce } from '@/lib/rollups/processRollupQueue';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let processed = 0;
    let upsertedTotal = 0;
    // Process up to a safe cap to avoid very long requests
    const CAP = 20;
    for (let i = 0; i < CAP; i++) {
      const res = await processRollupQueueOnce({ orgId: user.orgId });
      if (!res.ran) break;
      processed += 1;
      upsertedTotal += res.upserted ?? 0;
    }

    return NextResponse.json({ processed, upserted: upsertedTotal });
  } catch (error) {
    console.error('Rollup process endpoint failed:', error);
    return NextResponse.json({ error: 'Rollup process failed' }, { status: 500 });
  }
}
