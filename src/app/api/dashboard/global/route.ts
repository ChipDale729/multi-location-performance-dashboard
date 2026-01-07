import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  return NextResponse.json({
    message: 'Global dashboard stub',
    user: getCurrentUser(),
  });
}
