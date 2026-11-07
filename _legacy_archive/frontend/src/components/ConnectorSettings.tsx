import React, { useState } from 'react';
import { 
  Settings, 
  Copy, 
  Check, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Server,
  Eye,
  EyeOff,
  Link,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { ConnectorConfig } from '../types';

interface ConnectorSettingsProps {
  connectors: ConnectorConfig[];
  isLoading: boolean;
  onUpdateConnector: (id: string, updates: Partial<ConnectorConfig>) => Promise<void>;
  onTestConnector: (id: string) => Promise<{ success: boolean; message: string; latency_ms: number }>;
}

export const ConnectorSettings: React.FC<ConnectorSettingsProps> = ({
  connectors,
  isLoading,
  onUpdateConnector,
  onTestConnector
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string; latency_ms: number }>>({});
  const [editingConfig, setEditingConfig] = useState<Record<string, Partial<ConnectorConfig>>>({});

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await onTestConnector(id);
      setTestResults(prev => ({ ...prev, [id]: res }));
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: { success: false, message: err.message || 'Connection failed', latency_ms: 0 }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (id: string) => {
    const updates = editingConfig[id];
    if (updates) {
      await onUpdateConnector(id, updates);
      setEditingConfig(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <Card size="sm" className="bg-card/90 border-border/80 shadow-md">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Settings className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  ITSM Connectors & Webhook Endpoints
                </h2>
                <Badge variant="outline" className="font-mono text-[10px] h-4.5 px-1.5">
                  2-Way Bridge
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Two-way synchronization between your ticketing queues and physical IT asset inventory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {isLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3.5 animate-spin" />
                <span>Updating...</span>
              </div>
            )}
            <Badge variant="outline" className="gap-1.5 text-xs font-mono h-6 px-2 text-foreground">
              <Sparkles className="size-3 text-primary" />
              <span>Mock Simulation Available</span>
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {connectors.map((conn) => {
          const testRes = testResults[conn.id];
          const isJira = conn.id === 'jira';
          const isZendesk = conn.id === 'zendesk';
          const isSlack = conn.id === 'slack_alerts';
          const isRevealed = showToken[conn.id] || false;

          return (
            <Card 
              key={conn.id}
              size="sm"
              className="bg-card/90 border-border/80 hover:border-border transition-all flex flex-col justify-between"
            >
              <div className="space-y-4 p-5">
                {/* Connector Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-muted/60 border border-border flex items-center justify-center text-foreground">
                      <Server className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">
                          {conn.name}
                        </h3>
                        <Badge variant="outline" className="font-mono text-[9px] uppercase h-4 px-1">
                          {isJira ? 'Atlassian JSM' : isZendesk ? 'Zendesk Support' : isSlack ? 'Outbound Webhook' : 'Freshworks'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>Connected</span>
                        </span>
                        {conn.mock_mode && (
                          <Badge variant="secondary" className="font-mono text-[9px] h-4 px-1 text-muted-foreground">
                            Mock Mode Enabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Mock Mode Toggle Switch */}
                  <div className="flex items-center gap-2 bg-muted/40 px-2.5 py-1 rounded-md border border-border">
                    <Label className="text-xs text-muted-foreground cursor-pointer font-mono" htmlFor={`mock_${conn.id}`}>
                      Mock
                    </Label>
                    <Switch
                      id={`mock_${conn.id}`}
                      size="sm"
                      checked={conn.mock_mode}
                      onCheckedChange={(checked) => onUpdateConnector(conn.id, { mock_mode: !!checked })}
                    />
                  </div>
                </div>

                {/* Webhook Endpoint Box with 1-Click Copy */}
                <div className="bg-muted/30 p-3 rounded-lg border border-border space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 font-mono">
                      <Link className="size-3 text-primary" />
                      <span>Inbound Webhook Endpoint</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => handleCopy(conn.id, conn.webhook_url)}
                      className="h-5 px-1.5 gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground"
                    >
                      {copiedId === conn.id ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3" />}
                      <span>{copiedId === conn.id ? 'Copied' : 'Copy'}</span>
                    </Button>
                  </div>
                  <div className="font-mono text-xs text-foreground bg-background/80 px-2.5 py-1.5 rounded border border-border/80 select-all overflow-x-auto">
                    {conn.webhook_url}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    Register in {conn.name} Webhooks for <code className="text-foreground">ticket:created</code> and <code className="text-foreground">ticket:resolved</code> events.
                  </p>
                </div>

                {/* Credentials Form */}
                <div className="space-y-3 text-xs font-mono">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground font-medium">
                      Instance URL
                    </Label>
                    <Input
                      type="text"
                      defaultValue={conn.base_url}
                      onChange={(e) => setEditingConfig(prev => ({
                        ...prev,
                        [conn.id]: { ...(prev[conn.id] || {}), base_url: e.target.value }
                      }))}
                      placeholder={
                        isJira 
                          ? 'https://company.atlassian.net' 
                          : isZendesk 
                          ? 'https://company.zendesk.com' 
                          : isSlack 
                          ? 'https://hooks.slack.com/services/...' 
                          : 'https://company.freshservice.com'
                      }
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">
                        {isSlack ? 'Slack / Teams Channel' : 'Admin Email / User'}
                      </Label>
                      <Input
                        type="text"
                        defaultValue={conn.email_or_user}
                        onChange={(e) => setEditingConfig(prev => ({
                          ...prev,
                          [conn.id]: { ...(prev[conn.id] || {}), email_or_user: e.target.value }
                        }))}
                        placeholder={isSlack ? '#it-alerts' : 'it-admin@company.com'}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground font-medium">
                        {isSlack ? 'Alert Category Filter' : 'Workspace / Project Key'}
                      </Label>
                      <Input
                        type="text"
                        defaultValue={conn.project_or_workspace_key}
                        onChange={(e) => setEditingConfig(prev => ({
                          ...prev,
                          [conn.id]: { ...(prev[conn.id] || {}), project_or_workspace_key: e.target.value }
                        }))}
                        placeholder={isJira ? 'ITSM' : isZendesk ? 'SUPPORT' : isSlack ? 'ALL' : 'IT'}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground font-medium">
                        API Token / Secret Key
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => setShowToken(prev => ({ ...prev, [conn.id]: !prev[conn.id] }))}
                        className="h-4 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                      >
                        {isRevealed ? <EyeOff className="size-2.5" /> : <Eye className="size-2.5" />}
                        <span>{isRevealed ? 'Hide' : 'Reveal'}</span>
                      </Button>
                    </div>
                    <Input
                      type={isRevealed ? 'text' : 'password'}
                      placeholder={conn.api_key_or_token_masked || '••••••••••••••••'}
                      onChange={(e) => setEditingConfig(prev => ({
                        ...prev,
                        [conn.id]: { ...(prev[conn.id] || {}), api_key_or_token: e.target.value }
                      }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Connection Test Feedback Box */}
                {testRes && (
                  <div className={`p-2.5 rounded-md border text-xs flex items-start gap-2 font-mono ${
                    testRes.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-destructive/10 border-destructive/30 text-destructive'
                  }`}>
                    {testRes.success ? (
                      <CheckCircle2 className="size-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="size-3.5 flex-shrink-0 mt-0.5 text-destructive" />
                    )}
                    <div className="flex-1 space-y-0.5">
                      <p className="font-semibold">{testRes.message}</p>
                      <span className="text-[10px] text-muted-foreground block">
                        Roundtrip latency: {testRes.latency_ms} ms
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <CardFooter className="p-4 border-t border-border/60 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={() => handleTest(conn.id)}
                  disabled={testingId === conn.id}
                  className="gap-1.5 h-7 text-xs font-mono"
                >
                  <RefreshCw className={`size-3 ${testingId === conn.id ? 'animate-spin' : ''}`} />
                  <span>{testingId === conn.id ? 'Pinging...' : 'Ping & Test'}</span>
                </Button>

                <Button
                  type="button"
                  size="xs"
                  onClick={() => handleSave(conn.id)}
                  className="h-7 text-xs font-mono"
                >
                  Save Settings
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
