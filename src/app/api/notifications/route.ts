import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/seed';

export async function GET(request: NextRequest) {
  await ensureDatabaseSeeded();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30', 10), 1), 100);

  const notifications = await prisma.notification.findMany({
    orderBy: { id: 'desc' },
    take: limit,
  });

  const unreadCount = await prisma.notification.count({
    where: { is_read: 0 },
  });

  const formatted = notifications.map((n) => ({
    ...n,
    created_at: n.created_at.toISOString(),
  }));

  return NextResponse.json({
    notifications: formatted,
    unread_count: unreadCount,
  });
}
