import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function maskToken(token?: string | null): string {
  if (!token || token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();

    const existing = await prisma.connectorConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ detail: 'Connector not found' }, { status: 404 });
    }

    const updates: any = {};
    if (body.is_enabled !== undefined) updates.is_enabled = Boolean(body.is_enabled);
    if (body.base_url !== undefined) updates.base_url = body.base_url.trim();
    if (body.api_key_or_token !== undefined && body.api_key_or_token !== '') {
      updates.api_key_or_token = body.api_key_or_token.trim();
    }
    if (body.email_or_user !== undefined) updates.email_or_user = body.email_or_user.trim();
    if (body.project_or_workspace_key !== undefined) {
      updates.project_or_workspace_key = body.project_or_workspace_key.trim();
    }
    if (body.mock_mode !== undefined) updates.mock_mode = Boolean(body.mock_mode);

    const updated = await prisma.connectorConfig.update({
      where: { id },
      data: updates,
    });

    const baseHost = request.nextUrl.origin;
    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      is_enabled: Boolean(updated.is_enabled),
      base_url: updated.base_url || '',
      api_key_or_token_masked: maskToken(updated.api_key_or_token),
      email_or_user: updated.email_or_user || '',
      project_or_workspace_key: updated.project_or_workspace_key || '',
      mock_mode: Boolean(updated.mock_mode),
      last_sync_at: updated.last_sync_at?.toISOString() || null,
      status: updated.status || 'disconnected',
      webhook_url: `${baseHost}/api/webhooks/${updated.id}`,
    });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Failed to update connector' }, { status: 500 });
  }
}
