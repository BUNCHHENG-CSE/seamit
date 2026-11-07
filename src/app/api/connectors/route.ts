import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDatabaseSeeded } from '@/lib/seed';

function maskToken(token?: string | null): string {
  if (!token || token.length <= 8) return '••••••••';
  return `${token.slice(0, 4)}••••••••${token.slice(-4)}`;
}

export async function GET(request: NextRequest) {
  await ensureDatabaseSeeded();

  const baseHost = request.nextUrl.origin;
  const connectors = await prisma.connectorConfig.findMany({
    orderBy: { id: 'asc' },
  });

  const formatted = connectors.map((c) => ({
    id: c.id,
    name: c.name,
    is_enabled: Boolean(c.is_enabled),
    base_url: c.base_url || '',
    api_key_or_token_masked: maskToken(c.api_key_or_token),
    email_or_user: c.email_or_user || '',
    project_or_workspace_key: c.project_or_workspace_key || '',
    mock_mode: Boolean(c.mock_mode),
    last_sync_at: c.last_sync_at?.toISOString() || null,
    status: c.status || 'disconnected',
    webhook_url: `${baseHost}/api/webhooks/${c.id}`,
  }));

  return NextResponse.json(formatted);
}
