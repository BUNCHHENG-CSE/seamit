export interface NormalizedTicket {
  source: string;
  ticket_key: string;
  title: string;
  status: string;
  ticket_type: string;
  requester_email?: string | null;
  requester_name?: string | null;
  serial_number?: string | null;
  asset_tag?: string | null;
  event_name: string;
  raw_payload?: any;
}

export interface ConnectorConfigModel {
  id: string;
  name: string;
  is_enabled: boolean;
  base_url: string;
  api_key_or_token: string;
  email_or_user: string;
  project_or_workspace_key: string;
  webhook_secret: string;
  mock_mode: boolean;
  last_sync_at?: Date | null;
  status: string;
}

export abstract class BaseITSMConnector {
  protected config: Partial<ConnectorConfigModel>;
  protected mock_mode: boolean;
  protected base_url: string;
  protected api_key: string;
  protected email: string;
  protected project_key: string;

  constructor(config: Partial<ConnectorConfigModel>) {
    this.config = config || {};
    this.mock_mode = config.mock_mode ?? true;
    this.base_url = (config.base_url || '').trim();
    this.api_key = (config.api_key_or_token || '').trim();
    this.email = (config.email_or_user || '').trim();
    this.project_key = (config.project_or_workspace_key || '').trim();
  }

  abstract normalizeWebhook(payload: any): NormalizedTicket;

  abstract createTicket(
    summary: string,
    description: string,
    ticket_type?: string,
    priority?: string,
    extra_fields?: Record<string, any>
  ): Promise<{
    success: boolean;
    ticket_key: string;
    ticket_url?: string;
    status: string;
    summary: string;
    created_at?: string;
  }>;

  abstract testConnection(): Promise<{
    success: boolean;
    connector_id: string;
    message: string;
    latency_ms: number;
  }>;

  static extractIdentifiers(text: string): {
    asset_tag: string | null;
    serial_number: string | null;
  } {
    if (!text) return { asset_tag: null, serial_number: null };

    let asset_tag: string | null = null;
    let serial_number: string | null = null;

    // Check for asset tags: ASSET-1234, AST-1234, IT-1234
    const tagMatch = text.match(/\b(ASSET-\d+|AST-\d+|IT-\d+)\b/i);
    if (tagMatch) {
      asset_tag = tagMatch[1].toUpperCase();
    }

    // Check for serial numbers: SN: ..., Serial: ..., S/N: ...
    const snMatch = text.match(/\b(?:SN|Serial|S\/N)[:\s#]*([A-Z0-9]{6,20})\b/i);
    if (snMatch) {
      serial_number = snMatch[1].toUpperCase();
    }

    return { asset_tag, serial_number };
  }
}
