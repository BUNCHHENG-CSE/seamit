import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JiraConnector } from '@/lib/connectors/jira';
import { FreshserviceConnector } from '@/lib/connectors/freshservice';
import { ZendeskConnector } from '@/lib/connectors/zendesk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cfg = await prisma.connectorConfig.findUnique({
    where: { id },
  });

  if (!cfg) {
    return NextResponse.json({ detail: 'Connector not found' }, { status: 404 });
  }

  let connector;
  if (id === 'freshservice') {
    connector = new FreshserviceConnector(cfg);
  } else if (id === 'zendesk') {
    connector = new ZendeskConnector(cfg);
  } else {
    connector = new JiraConnector(cfg);
  }

  const result = await connector.testConnection();

  return NextResponse.json({
    success: result.success,
    message: result.message,
    connector_id: id,
    latency_ms: result.latency_ms,
  });
}
