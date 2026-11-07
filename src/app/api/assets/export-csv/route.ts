import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { exportAssetsToCsv } from '@/lib/connectors/csv';

export async function GET() {
  const assets = await prisma.asset.findMany({
    orderBy: { id: 'asc' },
  });

  const csv = exportAssetsToCsv(assets);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="tct_seamit_assets_inventory.csv"',
    },
  });
}
