import { BaseITSMConnector, NormalizedTicket } from './base';

export class ZendeskConnector extends BaseITSMConnector {
  normalizeWebhook(payload: any): NormalizedTicket {
    const ticketData = payload?.ticket || payload || {};

    const rawId = ticketData?.id || ticketData?.ticket_id || '1001';
    const ticket_key = String(rawId).startsWith('ZD-') ? String(rawId) : `ZD-${rawId}`;

    const summary =
      ticketData?.subject ||
      ticketData?.title ||
      ticketData?.ticket_title ||
      ticketData?.ticket_subject ||
      'Zendesk Ticket';

    const description =
      ticketData?.description ||
      ticketData?.ticket_description ||
      ticketData?.comment?.body ||
      '';

    const status_name = (
      ticketData?.status ||
      ticketData?.ticket_status ||
      'open'
    ).toLowerCase();

    const ticket_type =
      ticketData?.ticket_type ||
      ticketData?.type ||
      'Incident';

    const requester = ticketData?.requester || {};
    const requester_email =
      typeof requester === 'object'
        ? requester?.email || ticketData?.ticket_requester_email || null
        : ticketData?.ticket_requester_email || null;
    const requester_name =
      typeof requester === 'object'
        ? requester?.name || ticketData?.ticket_requester_name || null
        : ticketData?.ticket_requester_name || null;

    let asset_tag = ticketData?.asset_tag || ticketData?.ticket_asset_tag || null;
    let serial_number = ticketData?.serial_number || ticketData?.ticket_serial_number || null;

    const customFields = ticketData?.custom_fields;
    if (Array.isArray(customFields)) {
      for (const cf of customFields) {
        if (typeof cf === 'object' && cf !== null) {
          const val = String(cf.value || '');
          if (val.startsWith('ASSET-') || val.startsWith('AST-')) {
            asset_tag = val;
          } else if (
            String(cf.name || '').toLowerCase().includes('serial') ||
            val.length >= 8
          ) {
            if (!serial_number && /^[A-Za-z0-9]+$/.test(val)) {
              serial_number = val;
            }
          }
        }
      }
    }

    if (!asset_tag || !serial_number) {
      const extracted = BaseITSMConnector.extractIdentifiers(`${summary} ${description}`);
      if (!asset_tag) asset_tag = extracted.asset_tag;
      if (!serial_number) serial_number = extracted.serial_number;
    }

    let normalized_event = 'ticket_updated';
    if (['solved', 'closed', 'resolved', 'done'].includes(status_name)) {
      normalized_event = 'ticket_resolved';
    } else if (String(payload?.event || '').toLowerCase().includes('created') || status_name === 'new') {
      normalized_event = 'ticket_created';
    }

    return {
      source: 'zendesk',
      ticket_key,
      title: summary,
      status: status_name.charAt(0).toUpperCase() + status_name.slice(1),
      ticket_type: ticket_type.charAt(0).toUpperCase() + ticket_type.slice(1),
      requester_email,
      requester_name,
      serial_number,
      asset_tag,
      event_name: normalized_event,
      raw_payload: payload,
    };
  }

  async createTicket(
    summary: string,
    description: string,
    ticket_type: string = 'Hardware Refresh',
    priority: string = 'Normal',
    extra_fields?: Record<string, any>
  ): Promise<{
    success: boolean;
    ticket_key: string;
    ticket_url?: string;
    status: string;
    summary: string;
    created_at?: string;
  }> {
    if (this.mock_mode || !this.base_url || !this.api_key) {
      const mock_id = `ZD-${(Date.now() % 9000) + 1000}`;
      return {
        success: true,
        ticket_key: mock_id,
        ticket_url: `https://mock-company.zendesk.com/agent/tickets/${mock_id.replace('ZD-', '')}`,
        status: 'Created (Mock)',
        summary,
        created_at: new Date().toISOString(),
      };
    }

    const url = `${this.base_url.replace(/\/+$/, '')}/api/v2/tickets.json`;
    const payload = {
      ticket: {
        subject: summary,
        comment: { body: description },
        priority: priority.toLowerCase(),
        type: ticket_type.toLowerCase(),
        ...extra_fields,
      },
    };

    const userEmail = this.email.includes('/token') ? this.email : `${this.email}/token`;
    const authHeader = `Basic ${Buffer.from(`${userEmail}:${this.api_key}`).toString('base64')}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Zendesk API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const createdId = data?.ticket?.id || 'ZD-CREATED';
    const key = `ZD-${createdId}`;
    return {
      success: true,
      ticket_key: key,
      ticket_url: `${this.base_url.replace(/\/+$/, '')}/agent/tickets/${createdId}`,
      status: 'Created',
      summary,
    };
  }

  async testConnection(): Promise<{
    success: boolean;
    connector_id: string;
    message: string;
    latency_ms: number;
  }> {
    const start = Date.now();
    if (this.mock_mode || !this.base_url) {
      return {
        success: true,
        connector_id: 'zendesk',
        message:
          'Zendesk Support Desk simulator active (Mock Mode). Ready for inbound webhooks and ticket generation.',
        latency_ms: Date.now() - start + 14,
      };
    }

    try {
      const url = `${this.base_url.replace(/\/+$/, '')}/api/v2/users/me.json`;
      const userEmail = this.email.includes('/token') ? this.email : `${this.email}/token`;
      const authHeader = `Basic ${Buffer.from(`${userEmail}:${this.api_key}`).toString('base64')}`;

      const res = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const userName = data?.user?.name || this.email;
        return {
          success: true,
          connector_id: 'zendesk',
          message: `Successfully connected to Zendesk as ${userName}`,
          latency_ms: latency,
        };
      } else {
        const text = await res.text();
        return {
          success: false,
          connector_id: 'zendesk',
          message: `Zendesk API returned HTTP ${res.status}: ${text.slice(0, 200)}`,
          latency_ms: latency,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        connector_id: 'zendesk',
        message: `Connection failed: ${e.message}`,
        latency_ms: Date.now() - start,
      };
    }
  }
}
