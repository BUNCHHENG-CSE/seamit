import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { NotificationEngine } from '@/lib/engine/notification-engine';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const result = await NotificationEngine.notify(prisma, {
      title: payload.title || 'Test IT Operations Alert',
      message: payload.message || 'Testing real-time notification dispatch from TCT-SeamIT ITSM-ITAM Seam Filler.',
      severity: payload.severity || 'INFO',
      category: payload.category || 'test',
      link_tab: payload.link_tab || 'radar',
    });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to dispatch test alert' }, { status: 500 });
  }
}
