import React, { useState } from 'react';
import { 
  Radio, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Code, 
  Copy, 
  Check, 
  RotateCcw, 
  UserX, 
  Laptop, 
  Wrench, 
  PackageCheck, 
  Zap, 
  CheckCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { SimulatorTemplate, WebhookSyncResult } from '../types';

interface WebhookSimulatorProps {
  templates: SimulatorTemplate[];
  onTriggerSimulation: (source: string, payload: Record<string, any>) => Promise<WebhookSyncResult>;
  onRefreshData: () => void;
}

export const WebhookSimulator: React.FC<WebhookSimulatorProps> = ({
  templates,
  onTriggerSimulation,
  onRefreshData
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => templates[0]?.id || '');
  const [payloadString, setPayloadString] = useState<string>(() => 
    templates[0] ? JSON.stringify(templates[0].payload, null, 2) : '{}'
  );
  const [source, setSource] = useState<string>(() => templates[0]?.source || 'jira');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<WebhookSyncResult | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  if (!selectedTemplateId && templates.length > 0) {
    const first = templates[0];
    setSelectedTemplateId(first.id);
    setSource(first.source);
    setPayloadString(JSON.stringify(first.payload, null, 2));
  }

  const handleSelectTemplate = (tmpl: SimulatorTemplate) => {
    setSelectedTemplateId(tmpl.id);
    setSource(tmpl.source);
    setPayloadString(JSON.stringify(tmpl.payload, null, 2));
    setResult(null);
    setJsonError(null);
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(payloadString);
      setPayloadString(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch {
      setJsonError('Cannot format: Invalid JSON format');
    }
  };

  const handleReset = () => {
    const current = templates.find(t => t.id === selectedTemplateId);
    if (current) {
      setPayloadString(JSON.stringify(current.payload, null, 2));
      setJsonError(null);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(payloadString);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const handleFireWebhook = async () => {
    setJsonError(null);
    let parsed: Record<string, any>;
    try {
      parsed = JSON.parse(payloadString);
    } catch (e: any) {
      setJsonError(`Invalid JSON format: ${e.message}`);
      return;
    }

    setIsExecuting(true);
    try {
      const res = await onTriggerSimulation(source, parsed);
      setResult(res);
      onRefreshData();
    } catch (err: any) {
      setResult({
        status: 'failed',
        matched_rules: [],
        affected_assets: [],
        actions_taken: [],
        message: err.message || 'Execution error'
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getScenarioIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('offboard') || n.includes('resign') || n.includes('terminat')) {
      return <UserX className="size-3.5 text-rose-500" />;
    }
    if (n.includes('repair') || n.includes('broken') || n.includes('damage')) {
      return <Wrench className="size-3.5 text-amber-500" />;
    }
    if (n.includes('return') || n.includes('stock') || n.includes('check-in')) {
      return <PackageCheck className="size-3.5 text-primary" />;
    }
    return <Laptop className="size-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <Card size="sm" className="bg-card/90 border-border/80 shadow-md">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
              <Radio className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Interactive Webhook Testbench & Ticket Simulator
                </h2>
                <Badge variant="outline" className="font-mono text-[10px] h-4.5 px-1.5">
                  Sandbox
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Simulate incoming webhook payloads from Jira Service Management or Freshservice without configuring external API keys.
              </p>
            </div>
          </div>

          <Badge variant="outline" className="font-mono text-xs gap-1.5 h-6 px-2 text-emerald-500 border-emerald-500/30">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Testbench Ready</span>
          </Badge>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Preset Scenarios */}
        <div className="lg:col-span-1 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
              Test Scenarios
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">{templates.length} Presets</span>
          </div>

          <div className="space-y-2">
            {templates.map((tmpl) => {
              const isSelected = selectedTemplateId === tmpl.id;
              return (
                <Card
                  key={tmpl.id}
                  size="sm"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={`p-3.5 transition-all cursor-pointer border-border/80 ${
                    isSelected
                      ? 'bg-muted/60 border-primary ring-1 ring-primary/40'
                      : 'bg-card/90 hover:border-muted-foreground/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded bg-muted/60 border border-border">
                        {getScenarioIcon(tmpl.name)}
                      </div>
                      <Badge variant="outline" className="font-mono text-[9px] uppercase h-4 px-1">
                        {tmpl.source}
                      </Badge>
                    </div>

                    {isSelected && (
                      <CheckCircle2 className="size-3.5 text-primary" />
                    )}
                  </div>

                  <h4 className="text-xs font-semibold text-foreground">
                    {tmpl.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {tmpl.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Middle/Right Column: Payload Editor & Live Execution Output */}
        <div className="lg:col-span-2 space-y-4">
          <Card size="sm" className="bg-card/90 border-border/80 overflow-hidden shadow-md">
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 border-b border-border text-xs font-mono">
              <div className="flex items-center gap-2">
                <Code className="size-3.5 text-primary" />
                <span className="font-semibold text-foreground">Payload (JSON)</span>
                <span className="text-[10px] text-muted-foreground hidden sm:inline">• Live editable</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleFormatJson}
                  className="h-6 text-[11px] font-mono px-2"
                >
                  Format
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleReset}
                  className="h-6 text-[11px] font-mono px-2 gap-1"
                >
                  <RotateCcw className="size-2.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={handleCopy}
                  className="h-6 text-[11px] font-mono px-2 gap-1"
                >
                  {isCopied ? <Check className="size-2.5 text-emerald-500" /> : <Copy className="size-2.5" />}
                  <span className="hidden sm:inline">{isCopied ? 'Copied' : 'Copy'}</span>
                </Button>

                <Button
                  size="xs"
                  onClick={handleFireWebhook}
                  disabled={isExecuting}
                  className="h-6 text-xs font-mono gap-1.5 ml-1"
                >
                  <Send className={`size-3 ${isExecuting ? 'animate-pulse' : ''}`} />
                  <span>{isExecuting ? 'Sending...' : 'Dispatch Webhook'}</span>
                </Button>
              </div>
            </div>

            {/* JSON Textarea with IDE Styling */}
            <div className="p-3.5 bg-background/90 font-mono text-xs">
              <textarea
                value={payloadString}
                onChange={(e) => setPayloadString(e.target.value)}
                rows={12}
                className="w-full bg-transparent text-emerald-600 dark:text-emerald-400 focus:outline-none resize-none font-mono text-xs leading-relaxed selection:bg-muted"
                spellCheck={false}
              />
            </div>

            {jsonError && (
              <div className="p-2.5 bg-destructive/10 border-t border-destructive/20 text-destructive text-xs flex items-center gap-2 font-mono">
                <AlertCircle className="size-3.5 flex-shrink-0" />
                <span>{jsonError}</span>
              </div>
            )}
          </Card>

          {/* Real-time Execution Output Card */}
          {result && (
            <Card size="sm" className={`border transition-all ${
              result.status === 'success'
                ? 'bg-emerald-500/5 border-emerald-500/30'
                : result.status === 'skipped'
                ? 'bg-amber-500/5 border-amber-500/30'
                : 'bg-destructive/5 border-destructive/30'
            }`}>
              <CardContent className="p-4 space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline"
                      className={`text-[10px] h-5 ${
                        result.status === 'success'
                          ? 'text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                          : result.status === 'skipped'
                          ? 'text-amber-600 dark:text-amber-400 border-amber-500/40'
                          : 'text-destructive border-destructive/40'
                      }`}
                    >
                      {result.status.toUpperCase()}
                    </Badge>
                    <span className="text-xs font-semibold text-foreground font-sans">
                      Execution Result
                    </span>
                  </div>

                  {result.log_id && (
                    <span className="text-[11px] text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded border border-border">
                      Audit #{result.log_id}
                    </span>
                  )}
                </div>

                <p className="text-xs text-foreground font-sans leading-relaxed">
                  {result.message}
                </p>

                {/* Matched Rules */}
                {result.matched_rules && result.matched_rules.length > 0 && (
                  <div className="pt-2 border-t border-border/50 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <Zap className="size-3 text-primary" />
                      <span>Seam Rules Triggered:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {result.matched_rules.map((r, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs h-5">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions Taken */}
                {result.actions_taken && result.actions_taken.length > 0 && (
                  <div className="pt-2 text-xs space-y-1.5">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                      <CheckCircle className="size-3" />
                      <span>Inventory State Updates Applied:</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-emerald-600 dark:text-emerald-400 bg-background/80 p-2.5 rounded border border-border">
                      {result.actions_taken.map((act, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold">✓</span>
                          <span>{act}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
