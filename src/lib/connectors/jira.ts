import { BaseITSMConnector, NormalizedTicket } from './base';

export class JiraConnector extends BaseITSMConnector {
  normalizeWebhook(payload: any): NormalizedTicket {
    const event = payload?.webhookEvent || 'jira:issue_updated';
    const issue = payload?.issue || {};
    const fields = issue?.fields || {};

    const ticket_key = issue?.key || 'JSM-UNKNOWN';
    const summary = fields?.summary || '';
    const description_raw = fields?.description || '';
    const description_text =
      typeof description_raw === 'object'
        ? JSON.stringify(description_raw)
        : String(description_raw || '');

    const status_obj = fields?.status || {};
    const status_name = status_obj?.name || 'Open';

    const issuetype_obj = fields?.issuetype || {};
    const ticket_type = issuetype_obj?.name || 'Service Request';

    const reporter = fields?.reporter || {};
    const reporter_email = reporter?.emailAddress || null;
    const reporter_name = reporter?.displayName || null;

    let asset_tag: string | null = null;
    let serial_number: string | null = null;

    // Scan fields for asset tag or serial
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === 'string') {
        if (v.startsWith('ASSET-') || v.startsWith('AST-')) {
          asset_tag = v;
        } else if (k.toLowerCase().includes('serial') || v.toLowerCase().includes('serial')) {
          serial_number = v;
        }
      }
    }

    if (!asset_tag || !serial_number) {
      const extracted = BaseITSMConnector.extractIdentifiers(`${summary} ${description_text}`);
      if (!asset_tag) asset_tag = extracted.asset_tag;
      if (!serial_number) serial_number = extracted.serial_number;
    }

    let normalized_event = 'ticket_updated';
    if (event.includes('created')) {
      normalized_event = 'ticket_created';
    } else if (['resolved', 'closed', 'done', 'completed'].includes(status_name.toLowerCase())) {
      normalized_event = 'ticket_resolved';
    }

    return {
      source: 'jira',
      ticket_key,
      title: summary,
      status: status_name,
      ticket_type,
      requester_email: reporter_email,
      requester_name: reporter_name,
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
      const mock_id = `JSM-${(Date.now() % 9000) + 1000}`;
      return {
        success: true,
        ticket_key: mock_id,
        ticket_url: `https://mock-jira.atlassian.net/browse/${mock_id}`,
        status: 'Created (Mock)',
        summary,
        created_at: new Date().toISOString(),
      };
    }

    const url = `${this.base_url.replace(/\/+$/, '')}/rest/api/3/issue`;
    const authHeader = `Basic ${Buffer.from(`${this.email}:${this.api_key}`).toString('base64')}`;

    const payload: any = {
      fields: {
        project: { key: this.project_key || 'ITSM' },
        summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: description }],
            },
          ],
        },
        issuetype: { name: ticket_type },
        priority: { name: priority },
        ...extra_fields,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Jira API error ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const key = data?.key || 'JSM-CREATED';
    return {
      success: true,
      ticket_key: key,
      ticket_url: `${this.base_url.replace(/\/+$/, '')}/browse/${key}`,
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
        connector_id: 'jira',
        message:
          'Jira Service Management simulator active (Mock Mode). Webhooks and ticket creation fully operational.',
        latency_ms: Date.now() - start + 12,
      };
    }

    try {
      const url = `${this.base_url.replace(/\/+$/, '')}/rest/api/3/myself`;
      const authHeader = `Basic ${Buffer.from(`${this.email}:${this.api_key}`).toString('base64')}`;

      const res = await fetch(url, {
        headers: { Authorization: authHeader },
      });

      const latency = Date.now() - start;
      if (res.ok) {
        const data = await res.json();
        const userName = data?.displayName || this.email;
        return {
          success: true,
          connector_id: 'jira',
          message: `Successfully connected to Jira as ${userName}`,
          latency_ms: latency,
        };
      } else {
        const text = await res.text();
        return {
          success: false,
          connector_id: 'jira',
          message: `Jira API returned HTTP ${res.status}: ${text.slice(0, 200)}`,
          latency_ms: latency,
        };
      }
    } catch (e: any) {
      return {
        success: false,
        connector_id: 'jira',
        message: `Connection failed: ${e.message}`,
        latency_ms: Date.now() - start,
      };
    }
  }
}
