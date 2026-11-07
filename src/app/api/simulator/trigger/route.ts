import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JiraConnector } from '@/lib/connectors/jira';
import { FreshserviceConnector } from '@/lib/connectors/freshservice';
import { ZendeskConnector } from '@/lib/connectors/zendesk';
import { RuleEngine } from '@/lib/engine/rule-engine';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const source = body.source || 'jira';
    const rawEvent = body.payload || {};

    let connector;
    if (source === 'freshservice') {
      connector = new FreshserviceConnector({ mock_mode: true });
    } else if (source === 'zendesk') {
      connector = new ZendeskConnector({ mock_mode: true });
    } else {
      connector = new JiraConnector({ mock_mode: true });
    }

    const ticket = connector.normalizeWebhook(rawEvent);
    const result = await RuleEngine.processTicketEvent(ticket, prisma);

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Simulation failed' }, { status: 500 });
  }
}
