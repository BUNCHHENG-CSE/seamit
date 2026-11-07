import type {
  Asset,
  Rule,
  Recipe,
  SyncLog,
  SyncStats,
  DiscrepancyRadarResponse,
  ConnectorConfig,
  SimulatorTemplate,
  WebhookSyncResult,
  NotificationsResponse,
  DiscrepancyRemediationRequest,
  BulkAssetUpdateRequest,
  AssetLabelData,
  Soc2ComplianceSummary
} from './types';

const API_BASE = '/api';

export async function fetchAssets(query?: string, status?: string): Promise<Asset[]> {
  const params = new URLSearchParams();
  if (query) params.append('query', query);
  if (status && status !== 'all') params.append('status', status);
  const res = await fetch(`${API_BASE}/assets?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function createAsset(asset: Partial<Asset>): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(asset)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create asset' }));
    throw new Error(err.detail || 'Failed to create asset');
  }
  return res.json();
}

export async function updateAsset(id: number, updates: Partial<Asset>): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update asset');
  return res.json();
}

export async function deleteAsset(id: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete asset');
  return res.json();
}

export async function uploadAssetsCsv(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/assets/import-csv`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('CSV upload failed');
  return res.json();
}

export async function triggerLifecycleSync(): Promise<any> {
  const res = await fetch(`${API_BASE}/assets/check-lifecycle`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to trigger lifecycle sync');
  return res.json();
}

export async function fetchRules(): Promise<Rule[]> {
  const res = await fetch(`${API_BASE}/rules`);
  if (!res.ok) throw new Error('Failed to fetch rules');
  return res.json();
}

export async function fetchRuleRecipes(): Promise<Recipe[]> {
  const res = await fetch(`${API_BASE}/rules/recipes`);
  if (!res.ok) throw new Error('Failed to fetch recipes');
  return res.json();
}

export async function createRule(rule: Partial<Rule>): Promise<Rule> {
  const res = await fetch(`${API_BASE}/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
  if (!res.ok) throw new Error('Failed to create rule');
  return res.json();
}

export async function updateRule(id: string, updates: Partial<Rule>): Promise<Rule> {
  const res = await fetch(`${API_BASE}/rules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update rule');
  return res.json();
}

export async function deleteRule(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/rules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete rule');
  return res.json();
}

export async function fetchSyncLogs(limit = 50, status?: string, direction?: string, query?: string): Promise<SyncLog[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (status && status !== 'all') params.append('status', status);
  if (direction && direction !== 'all') params.append('direction', direction);
  if (query) params.append('query', query);
  const res = await fetch(`${API_BASE}/logs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch logs');
  return res.json();
}

export async function fetchSyncStats(): Promise<SyncStats> {
  const res = await fetch(`${API_BASE}/logs/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

export async function fetchDiscrepancyRadar(): Promise<DiscrepancyRadarResponse> {
  const res = await fetch(`${API_BASE}/discrepancies/radar`);
  if (!res.ok) throw new Error('Failed to scan discrepancies');
  return res.json();
}

export async function fetchConnectors(): Promise<ConnectorConfig[]> {
  const res = await fetch(`${API_BASE}/connectors`);
  if (!res.ok) throw new Error('Failed to fetch connectors');
  return res.json();
}

export async function updateConnector(id: string, updates: Partial<ConnectorConfig>): Promise<ConnectorConfig> {
  const res = await fetch(`${API_BASE}/connectors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update connector');
  return res.json();
}

export async function testConnector(id: string): Promise<{ success: boolean; message: string; latency_ms: number }> {
  const res = await fetch(`${API_BASE}/connectors/${id}/test`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to test connector');
  return res.json();
}

export async function fetchSimulatorTemplates(): Promise<SimulatorTemplate[]> {
  const res = await fetch(`${API_BASE}/simulator/templates`);
  if (!res.ok) throw new Error('Failed to fetch templates');
  return res.json();
}

export async function triggerSimulation(source: string, payload: Record<string, any>): Promise<WebhookSyncResult> {
  const res = await fetch(`${API_BASE}/simulator/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, payload })
  });
  if (!res.ok) throw new Error('Failed to trigger simulation');
  return res.json();
}

export async function remediateDiscrepancy(payload: DiscrepancyRemediationRequest): Promise<any> {
  const res = await fetch(`${API_BASE}/discrepancies/remediate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Remediation failed' }));
    throw new Error(err.detail || 'Remediation failed');
  }
  return res.json();
}

export async function bulkUpdateAssets(payload: BulkAssetUpdateRequest): Promise<any> {
  const res = await fetch(`${API_BASE}/assets/bulk-update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Bulk update failed' }));
    throw new Error(err.detail || 'Bulk update failed');
  }
  return res.json();
}

export async function fetchAssetLabelData(assetId: number): Promise<AssetLabelData> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/label-data`);
  if (!res.ok) throw new Error('Failed to fetch asset label data');
  return res.json();
}

export async function fetchNotifications(limit = 30): Promise<NotificationsResponse> {
  const res = await fetch(`${API_BASE}/notifications?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function markNotificationRead(id: number): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark notification as read');
  return res.json();
}

export async function markAllNotificationsRead(): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/read-all`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to mark all as read');
  return res.json();
}

export async function triggerTestAlert(payload: { title?: string; message?: string; severity?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/notifications/test-alert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to dispatch test alert');
  return res.json();
}

export async function fetchSoc2Report(): Promise<Soc2ComplianceSummary> {
  const res = await fetch(`${API_BASE}/reports/soc2-summary`);
  if (!res.ok) throw new Error('Failed to fetch SOC 2 report');
  return res.json();
}

export function getSoc2HtmlUrl(): string {
  return `${API_BASE}/reports/soc2-summary/html`;
}
