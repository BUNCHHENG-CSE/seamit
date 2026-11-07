import React, { useState } from 'react';
import { 
  History, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  ShieldCheck, 
  ArrowRight,
  Code,
  Sparkles,
  Ticket,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { SyncLog } from '../types';

interface AuditLogViewerProps {
  logs: SyncLog[];
  isLoading: boolean;
  onRefresh: () => void;
  onExportCompliance: () => void;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  logs,
  isLoading,
  onRefresh,
  onExportCompliance
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [directionFilter, setDirectionFilter] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [showRawJson, setShowRawJson] = useState<Record<number, boolean>>({});

  const filteredLogs = logs.filter(log => {
    const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
    const matchesDir = directionFilter === 'all' || log.direction === directionFilter;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || (
      (log.ticket_id && log.ticket_id.toLowerCase().includes(q)) ||
      (log.asset_tag && log.asset_tag.toLowerCase().includes(q)) ||
      (log.serial_number && log.serial_number.toLowerCase().includes(q)) ||
      (log.rule_name && log.rule_name.toLowerCase().includes(q)) ||
      log.action_summary.toLowerCase().includes(q)
    );
    return matchesStatus && matchesDir && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <Badge variant="outline" className="font-mono text-[10px] h-5 gap-1 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
            <CheckCircle2 className="size-3" />
            <span>Success</span>
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="outline" className="font-mono text-[10px] h-5 gap-1 text-destructive border-destructive/30">
            <XCircle className="size-3" />
            <span>Failed</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-mono text-[10px] h-5 gap-1 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <AlertCircle className="size-3" />
            <span>Skipped</span>
          </Badge>
        );
    }
  };

  const renderSmartDiff = (diff: Record<string, any>) => {
    const entries = Object.entries(diff);
    if (entries.length === 0) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {entries.map(([key, val]) => {
          let oldVal = '';
          let newVal = '';

          if (val && typeof val === 'object' && ('old' in val || 'new' in val)) {
            oldVal = String(val.old ?? 'None');
            newVal = String(val.new ?? 'None');
          } else {
            newVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
          }

          const formatKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

          return (
            <div key={key} className="bg-background/90 rounded-md p-2.5 border border-border text-xs space-y-1 font-mono">
              <span className="text-[10px] uppercase font-bold text-muted-foreground block tracking-wider">
                {formatKey}
              </span>
              <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
                {oldVal ? (
                  <>
                    <span className="line-through text-destructive/80 bg-destructive/10 px-1 py-0.5 rounded border border-destructive/20">
                      {oldVal}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
                  </>
                ) : null}
                <span className="text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                  {newVal}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Search Toolbar */}
      <Card size="sm" className="bg-card/90 border-border/80 shadow-md">
        <CardContent className="p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="flex flex-1 items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search audit trail by ticket, tag, serial, or action..."
                  className="pl-8 h-7 text-xs bg-muted/40 font-mono"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-7 bg-muted/40 border border-input rounded-md text-xs text-foreground px-2.5 focus:outline-none focus:border-ring cursor-pointer font-mono"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="skipped">Skipped</option>
                <option value="failed">Failed</option>
              </select>

              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="h-7 bg-muted/40 border border-input rounded-md text-xs text-foreground px-2.5 focus:outline-none focus:border-ring cursor-pointer font-mono"
              >
                <option value="all">All Directions</option>
                <option value="ticket_to_asset">Ticket ➔ Asset</option>
                <option value="asset_to_ticket">Asset ➔ Ticket</option>
              </select>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant="outline"
                size="xs"
                onClick={onRefresh}
                disabled={isLoading}
                className="h-7 px-2.5 gap-1.5 text-xs font-mono"
                title="Refresh Audit Logs"
              >
                <RefreshCw className={`size-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <Button
                size="xs"
                onClick={onExportCompliance}
                className="h-7 px-3 gap-1.5 text-xs font-mono"
              >
                <ShieldCheck className="size-3.5" />
                <span>Export SOC 2 CSV</span>
              </Button>
            </div>
          </div>

          {/* Count summary */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/60 font-mono">
            <span>
              Displaying <strong className="text-foreground">{filteredLogs.length}</strong> immutable audit events
            </span>
            <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
              SOC 2 Common Criteria CC6.8 & CC7.2 Compliant
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Visual Timeline Feed */}
      <div className="space-y-4">
        {filteredLogs.length === 0 ? (
          <Card className="py-16 text-center bg-card/60 border-dashed border-border/80">
            <CardContent className="space-y-2">
              <History className="size-10 text-muted-foreground/50 mx-auto" />
              <h4 className="text-sm font-semibold text-foreground">No Audit Events Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No synchronization events matched your filter criteria. Trigger a webhook or run lifecycle sync to generate logs.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative pl-6 sm:pl-7 space-y-3.5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              const hasDiff = log.diff_json && Object.keys(log.diff_json).length > 0;
              const rawActive = showRawJson[log.id] || false;

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Circle Node */}
                  <div className={`absolute -left-6 sm:-left-7 top-4 size-2.5 rounded-full border transition-all ${
                    log.status === 'success' 
                      ? 'bg-emerald-500 border-emerald-400' 
                      : log.status === 'failed' 
                      ? 'bg-destructive border-destructive' 
                      : 'bg-amber-500 border-amber-400'
                  }`} />

                  {/* Card Body */}
                  <Card size="sm" className="bg-card/90 border-border/80 hover:border-border transition-all">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                        <div className="space-y-2 flex-1">
                          {/* Meta Tags Row */}
                          <div className="flex items-center gap-2 flex-wrap font-mono">
                            <span className="text-[11px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">
                              {log.timestamp ? log.timestamp.replace('T', ' ').substring(0, 19) : ''}
                            </span>

                            <Badge 
                              variant={log.direction === 'ticket_to_asset' ? 'default' : 'secondary'}
                              className="text-[10px] h-5"
                            >
                              {log.direction === 'ticket_to_asset' ? 'Ticket ➔ Asset' : 'Asset ➔ Ticket'}
                            </Badge>

                            <Badge variant="outline" className="text-[10px] uppercase h-5">
                              {log.source}
                            </Badge>

                            {getStatusBadge(log.status)}
                          </div>

                          {/* Title, Rule & Links */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {log.rule_name || 'Standard Seam Sync'}
                            </span>

                            {log.ticket_id && (
                              <Badge variant="secondary" className="font-mono text-xs gap-1 h-5">
                                <Ticket className="size-3 text-muted-foreground" />
                                <span>{log.ticket_id}</span>
                              </Badge>
                            )}

                            {log.asset_tag && (
                              <Badge variant="outline" className="font-mono text-xs h-5">
                                {log.asset_tag}
                              </Badge>
                            )}

                            {log.serial_number && (
                              <span className="font-mono text-xs text-muted-foreground">
                                SN: {log.serial_number}
                              </span>
                            )}
                          </div>

                          {/* Summary description */}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {log.action_summary}
                          </p>

                          {log.error_message && (
                            <div className="p-2 rounded bg-destructive/10 border border-destructive/20 text-xs text-destructive font-mono">
                              Error: {log.error_message}
                            </div>
                          )}
                        </div>

                        {/* Right Action: Expand Diff */}
                        {hasDiff && (
                          <div className="flex items-center self-start pt-0.5">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="gap-1 h-6 text-xs font-mono"
                            >
                              <span>{isExpanded ? 'Hide Changes' : 'View Changes'}</span>
                              {isExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Expandable Clean Diff Viewer */}
                      {isExpanded && hasDiff && (
                        <div className="mt-3 pt-3 border-t border-border/60 space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-semibold text-foreground flex items-center gap-1.5">
                              <Sparkles className="size-3 text-primary" />
                              <span>State Transition Audit Diff</span>
                            </span>

                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => setShowRawJson(prev => ({ ...prev, [log.id]: !prev[log.id] }))}
                              className="h-5 text-[11px] gap-1 font-mono text-muted-foreground hover:text-foreground"
                            >
                              <Code className="size-3" />
                              <span>{rawActive ? 'Visual View' : 'Raw JSON'}</span>
                            </Button>
                          </div>

                          {rawActive ? (
                            <div className="p-3 bg-muted/40 rounded-md border border-border text-xs font-mono overflow-x-auto">
                              <pre className="text-emerald-600 dark:text-emerald-400 text-[11px] leading-relaxed">
                                {JSON.stringify(log.diff_json, null, 2)}
                              </pre>
                            </div>
                          ) : (
                            renderSmartDiff(log.diff_json)
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
