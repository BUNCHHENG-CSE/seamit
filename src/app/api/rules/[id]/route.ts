import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const rule = await prisma.rule.findUnique({
    where: { id },
  });

  if (!rule) {
    return NextResponse.json({ detail: 'Rule not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...rule,
    conditions: JSON.parse(rule.conditions_json || '{}'),
    actions: JSON.parse(rule.actions_json || '{}'),
    is_enabled: Boolean(rule.is_enabled),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const existing = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Rule not found' }, { status: 404 });
    }

    const updates: any = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.source !== undefined) updates.source = body.source;
    if (body.direction !== undefined) updates.direction = body.direction;
    if (body.event_type !== undefined) updates.event_type = body.event_type;
    if (body.conditions !== undefined) updates.conditions_json = JSON.stringify(body.conditions);
    if (body.actions !== undefined) updates.actions_json = JSON.stringify(body.actions);
    if (body.is_enabled !== undefined) updates.is_enabled = Boolean(body.is_enabled);

    const updated = await prisma.rule.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json({
      ...updated,
      conditions: JSON.parse(updated.conditions_json || '{}'),
      actions: JSON.parse(updated.actions_json || '{}'),
      is_enabled: Boolean(updated.is_enabled),
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to update rule' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const existing = await prisma.rule.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Rule not found' }, { status: 404 });
    }

    await prisma.rule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: `Rule ${id} deleted` });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to delete rule' }, { status: 500 });
  }
}
