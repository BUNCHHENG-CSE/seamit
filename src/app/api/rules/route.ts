import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/seed';

export async function GET() {
  await ensureDatabaseSeeded();

  const rules = await prisma.rule.findMany({
    orderBy: { created_at: 'asc' },
  });

  const formatted = rules.map((r) => ({
    ...r,
    conditions: JSON.parse(r.conditions_json || '{}'),
    actions: JSON.parse(r.actions_json || '{}'),
    is_enabled: Boolean(r.is_enabled),
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id || !body.name) {
      return NextResponse.json({ detail: 'id and name are required' }, { status: 400 });
    }

    const existing = await prisma.rule.findUnique({
      where: { id: body.id },
    });

    if (existing) {
      return NextResponse.json({ detail: `Rule ID '${body.id}' already exists` }, { status: 400 });
    }

    const newRule = await prisma.rule.create({
      data: {
        id: body.id,
        name: body.name,
        description: body.description || null,
        source: body.source || 'any',
        direction: body.direction || 'ticket_to_asset',
        event_type: body.event_type || 'ticket_resolved',
        conditions_json: JSON.stringify(body.conditions || {}),
        actions_json: JSON.stringify(body.actions || {}),
        is_enabled: body.is_enabled !== undefined ? Boolean(body.is_enabled) : true,
        execution_count: 0,
      },
    });

    return NextResponse.json(
      {
        ...newRule,
        conditions: JSON.parse(newRule.conditions_json || '{}'),
        actions: JSON.parse(newRule.actions_json || '{}'),
      },
      { status: 201 }
    );
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to create rule' }, { status: 500 });
  }
}
