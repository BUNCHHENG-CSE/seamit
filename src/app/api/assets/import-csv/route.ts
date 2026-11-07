import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { importAssetsFromCsv } from '@/lib/connectors/csv';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ detail: 'No CSV file uploaded' }, { status: 400 });
    }

    const fileText = await (file as Blob).text();
    const result = await importAssetsFromCsv(fileText, prisma);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'CSV upload failed' }, { status: 500 });
  }
}
