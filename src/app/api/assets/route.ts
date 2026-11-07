import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/seed';

export async function GET(request: NextRequest) {
  await ensureDatabaseSeeded();

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() || '';
  const status = searchParams.get('status')?.trim().toLowerCase() || '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '100', 10), 1), 500);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0);

  const where: any = {};

  if (status && status !== 'all') {
    where.status = status;
  }

  if (query) {
    where.OR = [
      { asset_tag: { contains: query } },
      { serial_number: { contains: query } },
      { model: { contains: query } },
      { assigned_to_name: { contains: query } },
      { assigned_to_email: { contains: query } },
      { location: { contains: query } },
    ];
  }

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { id: 'desc' },
    take: limit,
    skip: offset,
  });

  return NextResponse.json(assets);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.asset_tag || !body.serial_number || !body.model) {
      return NextResponse.json(
        { detail: 'asset_tag, serial_number, and model are required' },
        { status: 400 }
      );
    }

    const existing = await prisma.asset.findUnique({
      where: { asset_tag: body.asset_tag },
    });

    if (existing) {
      return NextResponse.json(
        { detail: `Asset tag '${body.asset_tag}' already exists` },
        { status: 400 }
      );
    }

    const newAsset = await prisma.asset.create({
      data: {
        asset_tag: body.asset_tag,
        serial_number: body.serial_number,
        model: body.model,
        category: body.category || 'Laptop',
        assigned_to_email: body.assigned_to_email || null,
        assigned_to_name: body.assigned_to_name || null,
        department: body.department || null,
        location: body.location || null,
        status: body.status || 'in_use',
        purchase_date: body.purchase_date || null,
        warranty_expiry_date: body.warranty_expiry_date || null,
        eol_date: body.eol_date || null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(newAsset, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to create asset' }, { status: 500 });
  }
}
