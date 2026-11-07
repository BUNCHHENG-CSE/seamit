import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LifecycleScheduler } from '@/lib/engine/scheduler';

export async function POST() {
  const result = await LifecycleScheduler.runLifecycleSync(prisma);
  return NextResponse.json(result);
}
