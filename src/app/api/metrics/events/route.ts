import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { metricEventsBatchSchema } from '@/lib/validation';

export async function POST(req: NextRequest) {
  const user = getCurrentUser();

  try {

    // Only admins and managers can upload
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json();
    const events = metricEventsBatchSchema.parse(json);
    
    // Uploaded events must be from same org as user
    for (const ev of events) {
        if (ev.orgId !== user.orgId) {
        return NextResponse.json({ error: 'Org mismatch' }, { status: 403 });
        }
    }

    return NextResponse.json({
      ok: true,
      received: events.length,
      message: 'Validated',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Invalid payload' }, { status: 400 });
  }
}
