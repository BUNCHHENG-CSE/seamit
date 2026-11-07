import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    app: 'TCT-SeamIT - SMB ITSM ⇄ ITAM Automated Seam Reconciler',
    version: '2.4.0',
    platform: 'Next.js 16 All-in-One Full Stack',
    orm: 'Prisma 6',
  });
}
