import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DiscrepancyRadar } from '@/lib/engine/discrepancy-radar';
import { ensureDatabaseSeeded } from '@/lib/seed';

export async function GET() {
  await ensureDatabaseSeeded();

  const result = await DiscrepancyRadar.scanDiscrepancies(prisma);
  return NextResponse.json(result);
}
