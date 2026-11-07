export interface Asset {
  id: number;
  asset_tag: string;
  serial_number: string;
  model: string;
  category: string;
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  department: string | null;
  location: string | null;
  status: 'in_use' | 'available' | 'in_repair' | 'pending_return' | 'retired' | 'lost_stolen' | 'pending_disposal';
  purchase_date: string | null;
  warranty_expiry_date: string | null;
  eol_date: string | null;
  notes: string | null;
  last_ticket_id: string | null;
  last_ticket_title: string | null;
  created_at: string;
  updated_at: string;
}

export interface RuleConditions {
  ticket_types?: string[];
  ticket_statuses?: string[];
  title_keywords?: string[];
  days_before_warranty?: number;
  days_before_eol?: number;
  asset_statuses?: string[];
}

export interface RuleActions {
  set_asset_status?: string;
  clear_assignee?: boolean;
  set_location?: string;
  append_notes?: string;
  create_ticket?: boolean;
  destination_itsm?: 'jira' | 'freshservice' | 'zendesk';
  ticket_type?: string;
  ticket_priority?: string;
  ticket_summary_template?: string;
  ticket_description_template?: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string | null;
  source: string;
  direction: 'ticket_to_asset' | 'asset_to_ticket';
  event_type: string;
  conditions: RuleConditions;
  actions: RuleActions;
  is_enabled: boolean;
  execution_count: number;
  last_executed_at: string | null;
  created_at: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  description: string;
  direction: 'ticket_to_asset' | 'asset_to_ticket';
  source: string;
  event_type: string;
  conditions: RuleConditions;
  actions: RuleActions;
}

export interface SyncLog {
  id: number;
  timestamp: string;
  direction: 'ticket_to_asset' | 'asset_to_ticket';
  rule_id: string | null;
  rule_name: string | null;
  source: string;
  ticket_id: string | null;
  ticket_title: string | null;
  asset_id: number | null;
  asset_tag: string | null;
  serial_number: string | null;
  action_summary: string;
  diff_json: Record<string, any>;
  status: 'success' | 'failed' | 'skipped';
  error_message: string | null;
}

export interface SyncStats {
  total_syncs: number;
  successful_syncs: number;
  failed_syncs: number;
  ticket_to_asset_count: number;
  asset_to_ticket_count: number;
  last_sync_timestamp: string | null;
}

export interface DiscrepancyItem {
  id: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  asset_id: number | null;
  asset_tag: string | null;
  serial_number: string | null;
  ticket_id: string | null;
  consequence: string;
  dollar_risk: number;
  suggested_action: string;
}

export interface DiscrepancySummary {
  total_discrepancies: number;
  high_severity_count: number;
  total_dollar_risk: number;
  estimated_hours_saved: number;
  audit_readiness_score: number;
  last_scanned_at: string;
}

export interface DiscrepancyRadarResponse {
  discrepancies: DiscrepancyItem[];
  summary: DiscrepancySummary;
}

export interface ConnectorConfig {
  id: 'jira' | 'freshservice' | 'zendesk' | 'slack_alerts' | string;
  name: string;
  is_enabled: boolean;
  base_url: string;
  api_key_or_token_masked: string;
  email_or_user: string;
  project_or_workspace_key: string;
  mock_mode: boolean;
  last_sync_at: string | null;
  status: string;
  webhook_url: string;
}

export interface SimulatorTemplate {
  id: string;
  name: string;
  source: string;
  description: string;
  payload: Record<string, any>;
}

export interface WebhookSyncResult {
  status: 'success' | 'skipped' | 'partial' | 'failed';
  matched_rules: string[];
  affected_assets: string[];
  actions_taken: string[];
  log_id?: number | null;
  message: string;
}

export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  category: string;
  link_tab: string | null;
  is_read: number;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: NotificationItem[];
  unread_count: number;
}

export interface DiscrepancyRemediationRequest {
  action: string;
  discrepancy_id?: string;
  asset_id?: number;
  target_status?: string;
  target_location?: string;
  assigned_to_name?: string;
  assigned_to_email?: string;
  ticket_id?: string;
}

export interface BulkAssetUpdateRequest {
  asset_ids: number[];
  status?: string;
  location?: string;
  department?: string;
  action?: 'update' | 'delete';
}

export interface AssetLabelData {
  asset_id: number;
  asset_tag: string;
  serial_number: string;
  model: string;
  category: string;
  department: string;
  assigned_to: string;
  qr_payload: string;
  barcode_data: string;
  printed_at: string;
}

export interface Soc2ComplianceSummary {
  report_id: string;
  generated_at: string;
  standards: string[];
  organization: string;
  audit_readiness_score: number;
  total_discrepancies: number;
  ghost_assets_count: number;
  dollar_risk_exposure: number;
  inventory_summary: {
    total_assets: number;
    in_use: number;
    available: number;
    in_repair: number;
    pending_return: number;
    retired: number;
    lost_stolen: number;
  };
  connectors_audited: Array<{
    id: string;
    name: string;
    is_enabled: boolean;
    mock_mode: boolean;
    status: string;
  }>;
  recent_custody_events_count: number;
  recent_custody_events: Array<{
    id: number;
    timestamp: string;
    ticket_id: string | null;
    asset_tag: string | null;
    action_summary: string;
    status: string;
  }>;
  attestation_statement: string;
}
