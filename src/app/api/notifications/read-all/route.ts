import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST() {
  await prisma.notification.updateMany({
    where: { is_read: 0 },
    data: { is_read: 1 },
  });

  return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
}
