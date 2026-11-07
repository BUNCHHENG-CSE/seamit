import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return NextResponse.json({ detail: 'Invalid asset ID' }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    return NextResponse.json({ detail: 'Asset not found' }, { status: 404 });
  }

  const now = new Date();
  const dateFormatted = `${now.toISOString().slice(0, 10)} ${now.toISOString().slice(11, 16)}`;

  return NextResponse.json({
    asset_id: asset.id,
    asset_tag: asset.asset_tag,
    serial_number: asset.serial_number,
    model: asset.model,
    category: asset.category,
    department: asset.department || 'General IT',
    assigned_to: asset.assigned_to_name || 'Available / In Stock',
    qr_payload: `seamit://asset/${asset.asset_tag}?sn=${asset.serial_number}`,
    barcode_data: asset.asset_tag,
    printed_at: dateFormatted,
  });
}
