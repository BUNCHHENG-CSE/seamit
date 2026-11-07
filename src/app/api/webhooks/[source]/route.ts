import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { JiraConnector } from '@/lib/connectors/jira';
import { FreshserviceConnector } from '@/lib/connectors/freshservice';
import { ZendeskConnector } from '@/lib/connectors/zendesk';
import { RuleEngine } from '@/lib/engine/rule-engine';
import type { NormalizedTicket } from '@/lib/connectors/base';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ source: string }> }
) {
  const { source } = await params;
  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ detail: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    let ticket: NormalizedTicket;

    if (source === 'freshservice') {
      const connector = new FreshserviceConnector({ mock_mode: true });
      ticket = connector.normalizeWebhook(payload);
    } else if (source === 'zendesk') {
      const connector = new ZendeskConnector({ mock_mode: true });
      ticket = connector.normalizeWebhook(payload);
    } else if (source === 'jira') {
      const connector = new JiraConnector({ mock_mode: true });
      ticket = connector.normalizeWebhook(payload);
    } else {
      ticket = {
        source: payload.source || source || 'generic',
        ticket_key: String(payload.ticket_key || payload.id || 'GEN-001'),
        title: payload.title || payload.summary || 'Generic Ticket',
        status: payload.status || 'Resolved',
        ticket_type: payload.ticket_type || payload.type || 'Hardware',
        requester_email: payload.requester_email || null,
        requester_name: payload.requester_name || null,
        serial_number: payload.serial_number || null,
        asset_tag: payload.asset_tag || null,
        event_name: payload.event_name || 'ticket_resolved',
        raw_payload: payload,
      };
    }

    const result = await RuleEngine.processTicketEvent(ticket, prisma);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || 'Webhook processing failed' }, { status: 500 });
  }
}
