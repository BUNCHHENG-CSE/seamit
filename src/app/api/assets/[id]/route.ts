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

  return NextResponse.json(asset);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return NextResponse.json({ detail: 'Invalid asset ID' }, { status: 400 });
  }

  try {
    const body = await request.json();

    const existing = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Asset not found' }, { status: 404 });
    }

    const updated = await prisma.asset.update({
      where: { id: assetId },
      data: {
        asset_tag: body.asset_tag ?? existing.asset_tag,
        serial_number: body.serial_number ?? existing.serial_number,
        model: body.model ?? existing.model,
        category: body.category ?? existing.category,
        assigned_to_email: body.assigned_to_email !== undefined ? body.assigned_to_email : existing.assigned_to_email,
        assigned_to_name: body.assigned_to_name !== undefined ? body.assigned_to_name : existing.assigned_to_name,
        department: body.department !== undefined ? body.department : existing.department,
        location: body.location !== undefined ? body.location : existing.location,
        status: body.status ?? existing.status,
        purchase_date: body.purchase_date !== undefined ? body.purchase_date : existing.purchase_date,
        warranty_expiry_date: body.warranty_expiry_date !== undefined ? body.warranty_expiry_date : existing.warranty_expiry_date,
        eol_date: body.eol_date !== undefined ? body.eol_date : existing.eol_date,
        notes: body.notes !== undefined ? body.notes : existing.notes,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to update asset' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const assetId = parseInt(id, 10);
  if (isNaN(assetId)) {
    return NextResponse.json({ detail: 'Invalid asset ID' }, { status: 400 });
  }

  try {
    const existing = await prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Asset not found' }, { status: 404 });
    }

    await prisma.asset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true, message: `Asset ${assetId} deleted` });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to delete asset' }, { status: 500 });
  }
}
