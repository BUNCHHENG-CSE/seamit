import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DiscrepancyRadar } from '@/lib/engine/discrepancy-radar';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await DiscrepancyRadar.remediate(prisma, payload);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Remediation failed' }, { status: 400 });
  }
}
