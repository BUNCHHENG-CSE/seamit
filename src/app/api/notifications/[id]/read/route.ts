import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const notifId = parseInt(id, 10);
  if (isNaN(notifId)) {
    return NextResponse.json({ detail: 'Invalid notification ID' }, { status: 400 });
  }

  await prisma.notification.update({
    where: { id: notifId },
    data: { is_read: 1 },
  });

  return NextResponse.json({ success: true, notification_id: notifId });
}
