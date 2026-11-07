import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  CheckCircle2,
  Zap, 
  Search, 
  ShieldCheck, 
  Radio, 
  Sparkles, 
  Ticket, 
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import type { DiscrepancyRadarResponse, DiscrepancyRemediationRequest } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DiscrepancyRadarProps {
  data: DiscrepancyRadarResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAsset: (assetId: number) => void;
  onTriggerLifecycle: () => void;
  onRemediate?: (payload: DiscrepancyRemediationRequest) => Promise<void>;
}

export const DiscrepancyRadar: React.FC<DiscrepancyRadarProps> = ({
  data,
  isLoading,
  onRefresh,
  onSelectAsset,
  onTriggerLifecycle,
  onRemediate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dollar' | 'severity' | 'default'>('dollar');

  const categories = useMemo(() => {
    if (!data?.discrepancies) return [];
    const set = new Set(data.discrepancies.map(d => d.category));
    return Array.from(set);
  }, [data]);

  const filteredDiscrepancies = useMemo(() => {
    if (!data?.discrepancies) return [];
    return data.discrepancies
      .filter(d => {
        const matchesSeverity = severityFilter === 'all' || d.severity.toLowerCase() === severityFilter.toLowerCase();
        const matchesCategory = categoryFilter === 'all' || d.category === categoryFilter;
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q || (
          d.title.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          (d.asset_tag && d.asset_tag.toLowerCase().includes(q)) ||
          (d.serial_number && d.serial_number.toLowerCase().includes(q)) ||
          (d.ticket_id && d.ticket_id.toLowerCase().includes(q)) ||
          d.consequence.toLowerCase().includes(q)
        );
        return matchesSeverity && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'dollar') return b.dollar_risk - a.dollar_risk;
        if (sortBy === 'severity') {
          const score = (s: string) => s === 'HIGH' ? 3 : s === 'MEDIUM' ? 2 : 1;
          return score(b.severity) - score(a.severity);
        }
        return 0;
      });
  }, [data, severityFilter, categoryFilter, searchQuery, sortBy]);

  if (isLoading || !data) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-muted-foreground border-border">
        <div className="relative mb-4">
          <div className="size-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <Radio className="size-5 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <h3 className="font-heading font-medium text-sm text-foreground">Scanning ITSM & ITAM Seams</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
          Cross-referencing live ticketing events against physical asset inventories...
        </p>
      </Card>
    );
  }

  const { discrepancies, summary } = data;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
        return (
          <Badge variant="destructive" className="h-5 gap-1 text-[10px] uppercase font-mono">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            <span>High Risk</span>
          </Badge>
        );
      case 'MEDIUM':
        return (
          <Badge variant="secondary" className="h-5 gap-1 text-[10px] uppercase font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
            <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span>Warning</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="h-5 gap-1 text-[10px] uppercase font-mono text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            <span>Info</span>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Modern Radar Hero Banner with Visual Radar Effect */}
      <Card className="relative overflow-hidden border-border bg-card/80 p-5">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-[10px] gap-1 font-mono">
                <Sparkles className="size-3 text-primary" />
                <span>Automated Discrepancy Engine</span>
              </Badge>
              <span className="text-xs text-muted-foreground">
                Auditing ITSM ⇄ ITAM state divergence
              </span>
            </div>

            <h2 className="font-heading font-bold text-lg sm:text-xl text-foreground tracking-tight">
              Discrepancy Radar: Eliminating the Manual Seam
            </h2>

            <p className="text-xs text-muted-foreground leading-relaxed">
              When ticket updates and spreadsheets fall out of sync, SMBs suffer uncollected offboarding laptops, ghost devices, and audit failures. SeamIT bridges each seam automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="gap-1.5"
            >
              <RefreshCw className="size-3.5" />
              <span>Rescan</span>
            </Button>

            {onRemediate && summary.total_discrepancies > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onRemediate({ action: 'remediate_all_low_hanging' })}
                className="gap-1.5 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Batch auto-fix all ghost assets and zombie repairs to available stock in 1 click"
              >
                <CheckCircle2 className="size-3.5" />
                <span>1-Click Fix All Low-Hanging</span>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onTriggerLifecycle}
              className="gap-1.5 font-medium"
            >
              <Zap className="size-3.5" />
              <span>Auto-Generate Tickets</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* KPI Stat Cards with Interactive Filter Clicking */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Audit Readiness Score */}
        <Card className="p-4 border-border bg-card hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Audit Readiness</span>
            <div className={`p-1.5 rounded-md ${summary.audit_readiness_score > 80 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5 font-mono">
            <span className="text-2xl font-bold text-foreground tracking-tight">{summary.audit_readiness_score}%</span>
            <span className="text-xs text-muted-foreground">/ 100% Target</span>
          </div>
          <div className="mt-2.5 w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                summary.audit_readiness_score > 80 
                  ? 'bg-emerald-500' 
                  : summary.audit_readiness_score > 60 
                  ? 'bg-amber-500' 
                  : 'bg-destructive'
              }`}
              style={{ width: `${summary.audit_readiness_score}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-between font-mono">
            <span>SOC 2 / ISO 27001</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Passing</span>
          </p>
        </Card>

        {/* Financial Risk Exposed */}
        <Card 
          onClick={() => {
            setSeverityFilter('high');
            setSortBy('dollar');
          }}
          className="p-4 border-border bg-card hover:border-destructive/40 transition-colors cursor-pointer"
          title="Click to filter by High Risk"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Financial Risk</span>
            <div className="p-1.5 rounded-md bg-destructive/10 text-destructive">
              <DollarSign className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline font-mono">
            <span className="text-2xl font-bold text-destructive tracking-tight">
              ${summary.total_dollar_risk.toLocaleString()}
            </span>
          </div>
          <div className="mt-2.5 flex items-center space-x-1.5 text-[10px] text-destructive/90 font-mono">
            <AlertTriangle className="size-3 shrink-0" />
            <span className="truncate">Hardware loss & duplicate spend</span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 font-mono">Filter high exposure ➔</p>
        </Card>

        {/* Active Discrepancies Count */}
        <Card 
          onClick={() => setSeverityFilter('all')}
          className="p-4 border-border bg-card hover:border-foreground/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Active Seams</span>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2 font-mono">
            <span className="text-2xl font-bold text-foreground tracking-tight">{summary.total_discrepancies}</span>
            <Badge variant="destructive" className="h-4 text-[9px] font-mono">
              {summary.high_severity_count} High
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2.5 flex items-center justify-between font-mono">
            <span>Ticket vs ITAM mismatches</span>
            <span className="text-foreground font-semibold">{discrepancies.length} Total</span>
          </p>
        </Card>

        {/* Monthly Hours Reclaimed */}
        <Card className="p-4 border-border bg-card hover:border-foreground/20 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-wider">Admin Saved</span>
            <div className="p-1.5 rounded-md bg-muted text-foreground">
              <Clock className="size-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5 font-mono">
            <span className="text-2xl font-bold text-foreground tracking-tight">{summary.estimated_hours_saved} hrs</span>
            <span className="text-xs text-muted-foreground">/ mo</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2.5 font-mono leading-tight">
            Automates reconciliation for lean SMB IT teams
          </p>
        </Card>
      </div>

      {/* Discrepancy Filter & Search Toolbar */}
      <Card className="p-3 border-border bg-card/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discrepancies by tag, user, ticket or issue..."
            className="pl-8 h-7 text-xs font-mono"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none">
          <span className="text-xs text-muted-foreground font-mono mr-1 hidden sm:inline">Severity:</span>
          {['all', 'high', 'medium', 'low'].map((sev) => {
            const isActive = severityFilter === sev;
            const label = sev === 'all' ? 'All' : sev.toUpperCase();
            return (
              <Button
                key={sev}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setSeverityFilter(sev)}
                className="h-6 px-2 text-[11px] font-mono"
              >
                {label}
              </Button>
            );
          })}
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs font-mono text-foreground focus-visible:border-ring outline-none cursor-pointer"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Sort selector */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-muted-foreground font-mono hidden lg:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-7 rounded-md border border-input bg-input/20 px-2 text-xs font-mono text-foreground focus-visible:border-ring outline-none cursor-pointer"
          >
            <option value="dollar">Highest Financial Exposure</option>
            <option value="severity">Highest Severity First</option>
            <option value="default">Default Order</option>
          </select>
        </div>
      </Card>

      {/* Discrepancy Item Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
          <span>
            Showing <strong className="text-foreground">{filteredDiscrepancies.length}</strong> of {discrepancies.length} detected discrepancies
          </span>
          {(severityFilter !== 'all' || categoryFilter !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSeverityFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="text-primary hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>

        {filteredDiscrepancies.length === 0 ? (
          <Card className="p-10 text-center border-border">
            <CheckCircle className="size-10 text-emerald-600 dark:text-emerald-400 mx-auto mb-2" />
            <h4 className="font-heading font-medium text-sm text-foreground">No Discrepancies Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              All ticket resolutions and asset inventory entries match the current filter criteria.
            </p>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filteredDiscrepancies.map((disc) => {
              const isHigh = disc.severity === 'HIGH';
              const isWarning = disc.severity === 'MEDIUM';

              return (
                <Card 
                  key={disc.id}
                  className={`p-4 border-border transition-colors relative overflow-hidden group hover:border-foreground/20 ${
                    isHigh ? 'border-destructive/30 bg-destructive/5' : isWarning ? 'border-amber-500/20 bg-amber-500/5' : ''
                  }`}
                >
                  {/* Left Edge Accent Bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isHigh ? 'bg-destructive' : isWarning ? 'bg-amber-400' : 'bg-muted-foreground'
                  }`} />

                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3.5 pl-1.5">
                    {/* Main Content Info */}
                    <div className="space-y-2.5 flex-1">
                      {/* Badge Ribbon */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {getSeverityBadge(disc.severity)}
                        
                        <Badge variant="outline" className="text-[10px] h-5 font-mono">
                          {disc.category}
                        </Badge>

                        {disc.asset_tag && (
                          <Badge variant="secondary" className="text-[10px] h-5 font-mono font-bold">
                            {disc.asset_tag}
                          </Badge>
                        )}

                        {disc.serial_number && (
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border">
                            SN: {disc.serial_number}
                          </span>
                        )}

                        {disc.ticket_id && (
                          <Badge variant="outline" className="text-[10px] h-5 font-mono flex items-center space-x-1 text-primary">
                            <Ticket className="size-3" />
                            <span>{disc.ticket_id}</span>
                          </Badge>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="font-heading font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                          {disc.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {disc.description}
                        </p>
                      </div>

                      {/* Structured Seam Comparison / Consequence Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                        <div className="bg-muted/40 rounded-md p-2.5 border border-border/80 text-xs">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-destructive block mb-0.5">
                            Operational Consequence:
                          </span>
                          <span className="text-foreground/90 leading-tight block text-[11px]">
                            {disc.consequence}
                          </span>
                        </div>

                        <div className="bg-muted/40 rounded-md p-2.5 border border-border/80 text-xs">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary block mb-0.5">
                            Suggested Seam Action:
                          </span>
                          <span className="text-foreground/90 leading-tight block text-[11px]">
                            {disc.suggested_action}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Action Column */}
                    <div className="flex flex-col items-start lg:items-end justify-between self-stretch lg:min-w-[150px] pt-2 lg:pt-0 border-t lg:border-t-0 border-border">
                      {/* Financial Risk Pill */}
                      <div className="text-left lg:text-right mb-2">
                        <span className="text-[9px] uppercase font-mono font-bold text-muted-foreground block tracking-wider">
                          Financial Exposure
                        </span>
                        <span className="text-base font-bold text-destructive font-mono">
                          ${disc.dollar_risk.toLocaleString()}
                        </span>
                      </div>

                      {/* Quick Remediation Actions */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-1.5 w-full lg:w-auto items-stretch lg:items-end">
                        {onRemediate && disc.id.startsWith('disc_orphan_') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'set_available', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-7 text-xs font-mono gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            title="Move unassigned device to Available Storage Bay"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Set Available</span>
                          </Button>
                        )}

                        {onRemediate && disc.id.startsWith('disc_repair_') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'return_to_available', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-7 text-xs font-mono gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                            title="Return repaired device to available stock"
                          >
                            <CheckCircle2 className="size-3" />
                            <span>Return to Stock</span>
                          </Button>
                        )}

                        {onRemediate && (disc.id.startsWith('disc_warranty_') || disc.id.startsWith('disc_expired_')) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'create_refresh_ticket', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-7 text-xs font-mono gap-1 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                            title="Generate proactive hardware refresh ticket in ITSM"
                          >
                            <Zap className="size-3" />
                            <span>Create Ticket</span>
                          </Button>
                        )}

                        {onRemediate && disc.id.startsWith('disc_unlinked_log_') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemediate({ action: 'dismiss_unlinked', discrepancy_id: disc.id })}
                            className="h-7 text-xs font-mono"
                          >
                            <span>Dismiss</span>
                          </Button>
                        )}

                        {/* Inspect Button */}
                        {disc.asset_id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectAsset(disc.asset_id!)}
                            className="w-full lg:w-auto h-7 text-xs font-mono gap-1"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="size-3.5" />
                          </Button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic font-mono text-center">No asset linked</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

