import { BaseITSMConnector, NormalizedTicket } from './base';

export class FreshserviceConnector extends BaseITSMConnector {
  normalizeWebhook(payload: any): NormalizedTicket {
    const data = payload?.freshservice_webhook || payload?.ticket || payload || {};

    let rawId = String(data?.ticket_id || data?.id || 'FS-UNKNOWN');
    if (!rawId.startsWith('FS-')) {
      rawId = `FS-${rawId}`;
    }

    const title = data?.ticket_subject || data?.subject || data?.title || '';
    const description = data?.ticket_description || data?.description || '';

    const statusRaw = String(data?.ticket_status || data?.status || 'Open');
    const statusMap: Record<string, string> = {
      '2': 'Open',
      '3': 'Pending',
      '4': 'Resolved',
      '5': 'Closed',
    };
    const status_name = statusMap[statusRaw] || statusRaw;

    const ticket_type = data?.ticket_type || data?.type || 'Service Request';
    const requester_email = data?.ticket_requester_email || data?.requester_email || null;
    const requester_name = data?.ticket_requester_name || data?.requester_name || null;

    let asset_tag = data?.ticket_asset_tag || data?.asset_tag || null;
    let serial_number = data?.ticket_serial_number || data?.serial_number || null;

    if (!asset_tag || !serial_number) {
      const extracted = BaseITSMConnector.extractIdentifiers(`${title} ${description}`);
      if (!asset_tag) asset_tag = extracted.asset_tag;
      if (!serial_number) serial_number = extracted.serial_number;
    }

    let event_name = 'ticket_updated';
    if (['resolved', 'closed', 'completed'].includes(status_name.toLowerCase())) {
      event_name = 'ticket_resolved';
    }

    return {
      source: 'freshservice',
      ticket_key: rawId,
      title,
      status: status_name,
      ticket_type,
      requester_email,
      requester_name,
      serial_number,
      asset_tag,
      event_name,
      raw_payload: payload,
    };
  }

  async createTicket(
    summary: string,
    description: string,
    ticket_type: string = 'Hardware Refresh',
    priority: string = 'Medium',
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
      const mock_id = `FS-${(Date.now() % 9000) + 1000}`;
      return {
        success: true,
        ticket_key: mock_id,
        ticket_url: `https://mock-company.freshservice.com/helpdesk/tickets/${mock_id.replace('FS-', '')}`,
        status: 'Created (Mock)',
        summary,
        created_at: new Date().toISOString(),
      };
    }

    const url = `${this.base_url.replace(/\/+$/, '')}/api/v2/tickets`;
    const priorityMap: Record<string, number> = {
      Low: 1,
      Medium: 2,
      High: 3,
      Urgent: 4,
    };
    const pVal = priorityMap[priority] || 2;

    const payload = {
      subject: summary,
      description,
      status: 2, // Open
      priority: pVal,
      email: this.email || 'helpdesk@company.com',
      ...extra_fields,
    };

    const authHeader = `Basic ${Buffer.from(`${this.api_key}:X`).toString('base64')}`;

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
      throw new Error(`Freshservice API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const createdId = data?.ticket?.id || 'FS-CREATED';
    const key = `FS-${createdId}`;
    return {
      success: true,
      ticket_key: key,
      ticket_url: `${this.base_url.replace(/\/+$/, '')}/helpdesk/tickets/${createdId}`,
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
        connector_id: 'freshservice',
        message:
          'Freshservice Service Desk simulator active (Mock Mode). Ready for inbound webhooks and ticket generation.',
        latency_ms: Date.now() - start + 10,
      };
    }

    try {
      const url = `${this.base_url.replace(/\/+$/, '')}/api/v2/tickets?per_page=1`;
      const authHeader = `Basic ${Buffer.from(`${this.api_key}:X`).toString('base64')}`;

      const res = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      const latency = Date.now() - start;
      if (res.ok) {
        return {
          success: true,
          connector_id: 'freshservice',
          message: 'Successfully verified Freshservice API credentials and permissions.',
          latency_ms: latency,
        };
      } else {
        const text = await res.text();
        return {
          success: false,
          connector_id: 'freshservice',
          message: `Freshservice API error HTTP ${res.status}: ${text.slice(0, 200)}`,
          latency_ms: latency,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        connector_id: 'freshservice',
        message: `Connection failed: ${e.message}`,
        latency_ms: Date.now() - start,
      };
    }
  }
}
