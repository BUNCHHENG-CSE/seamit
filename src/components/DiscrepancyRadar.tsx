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
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  X,
  AlertCircle,
  Copy,
  ExternalLink
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  if (isLoading || !data) {
    return (
      <Card className="flex flex-col items-center justify-center p-16 text-muted-foreground border-border/80 bg-card/60 backdrop-blur-md rounded-2xl">
        <div className="relative mb-4">
          <div className="size-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
          <Radio className="size-5 text-primary absolute inset-0 m-auto animate-pulse" />
        </div>
        <h3 className="font-semibold text-sm text-foreground">Scanning ITSM & ITAM Seams</h3>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm text-center">
          Cross-referencing live ticketing states against physical asset inventories...
        </p>
      </Card>
    );
  }

  const { discrepancies, summary } = data;

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight bg-destructive/15 text-destructive border border-destructive/30">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            <span>HIGH RISK</span>
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-tight bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>WARNING</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium tracking-tight bg-muted text-muted-foreground border border-border">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            <span>INFO</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Modern Radar Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/95 to-card/70 backdrop-blur-xl p-6 shadow-xs">
        {/* Subtle radial glow in background */}
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 size-80 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2.5 flex-wrap gap-y-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3.5 text-primary" />
                <span>Automated Discrepancy Engine</span>
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Auditing ITSM ⇄ ITAM state divergence
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Discrepancy Radar: Eliminating the Manual Seam
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-xl">
              When ticket updates and spreadsheets fall out of sync, SMBs suffer uncollected offboarding laptops, ghost devices, and audit failures. TCT-SeamIT bridges each seam automatically.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-8 gap-1.5 text-xs font-medium border-border/80 hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <RefreshCw className="size-3.5 text-muted-foreground" />
              <span>Rescan</span>
            </Button>

            {onRemediate && summary.total_discrepancies > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => onRemediate({ action: 'remediate_all_low_hanging' })}
                className="h-8 gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs ring-1 ring-emerald-400/25 transition-all cursor-pointer"
                title="Batch auto-fix all ghost assets and zombie repairs to available stock in 1 click"
              >
                <CheckCircle2 className="size-3.5" />
                <span>1-Click Auto-Fix All</span>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onTriggerLifecycle}
              className="h-8 gap-1.5 text-xs font-medium shadow-xs transition-all cursor-pointer"
            >
              <Zap className="size-3.5 text-primary-foreground" />
              <span>Auto-Generate Tickets</span>
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Audit Readiness Score */}
        <div className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-border transition-all duration-200 shadow-2xs group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Audit Readiness
            </span>
            <div className={`p-1.5 rounded-lg border ${
              summary.audit_readiness_score > 80 
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            }`}>
              <ShieldCheck className="size-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {summary.audit_readiness_score}%
            </span>
            <span className="text-xs text-muted-foreground font-mono">/ 100% Target</span>
          </div>

          <div className="mt-2.5 w-full bg-muted/60 rounded-full h-1.5 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                summary.audit_readiness_score > 80 
                  ? 'bg-emerald-500' 
                  : summary.audit_readiness_score > 60 
                  ? 'bg-gradient-to-r from-amber-500 to-emerald-500' 
                  : 'bg-destructive'
              }`}
              style={{ width: `${summary.audit_readiness_score}%` }}
            />
          </div>

          <div className="text-[11px] text-muted-foreground mt-2.5 flex items-center justify-between">
            <span>SOC 2 / ISO 27001</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px]">
              <span className="size-1 rounded-full bg-emerald-500" /> Passing
            </span>
          </div>
        </div>

        {/* Financial Risk Exposed */}
        <div 
          onClick={() => {
            setSeverityFilter('high');
            setSortBy('dollar');
          }}
          className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-destructive/40 transition-all duration-200 cursor-pointer shadow-2xs group"
          title="Click to filter by High Financial Risk"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Financial Risk
            </span>
            <div className="p-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 group-hover:scale-105 transition-transform">
              <DollarSign className="size-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline">
            <span className="text-2xl font-bold font-mono text-destructive tracking-tight">
              ${summary.total_dollar_risk.toLocaleString()}
            </span>
          </div>

          <div className="mt-2 flex items-center space-x-1.5 text-[11px] text-destructive/90">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span className="truncate">Hardware loss & duplicate spend</span>
          </div>

          <div className="text-[10px] text-muted-foreground mt-2 font-mono flex items-center justify-between group-hover:text-foreground transition-colors">
            <span>Filter high exposure</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>

        {/* Active Discrepancies Count */}
        <div 
          onClick={() => setSeverityFilter('all')}
          className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-border transition-all duration-200 cursor-pointer shadow-2xs group"
          title="Click to view all seams"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Active Seams
            </span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="size-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {summary.total_discrepancies}
            </span>
            {summary.high_severity_count > 0 && (
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/25">
                {summary.high_severity_count} High
              </span>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground mt-3 flex items-center justify-between">
            <span>Ticket vs ITAM mismatches</span>
            <span className="font-semibold text-foreground font-mono">{discrepancies.length} Total</span>
          </div>
        </div>

        {/* Monthly Hours Reclaimed */}
        <div className="p-4 rounded-xl border border-border/80 bg-card/80 hover:border-border transition-all duration-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-medium text-muted-foreground uppercase tracking-wider">
              Admin Saved
            </span>
            <div className="p-1.5 rounded-lg bg-muted text-foreground border border-border/60">
              <Clock className="size-4" />
            </div>
          </div>

          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-foreground tracking-tight">
              {summary.estimated_hours_saved} hrs
            </span>
            <span className="text-xs text-muted-foreground font-mono">/ mo</span>
          </div>

          <div className="text-[11px] text-muted-foreground mt-3 leading-tight">
            Automates reconciliation for lean SMB IT teams
          </div>
        </div>
      </div>

      {/* Discrepancy Filter & Search Toolbar */}
      <div className="p-3 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discrepancies by tag, user, ticket or issue..."
            className="pl-8.5 pr-8 h-8 text-xs bg-background/60 border-border/80 rounded-lg focus-visible:ring-1 focus-visible:ring-primary/40"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Severity Segmented Switcher */}
          <div className="flex items-center p-0.5 bg-muted/60 border border-border/70 rounded-lg">
            {['all', 'high', 'medium', 'low'].map((sev) => {
              const isActive = severityFilter === sev;
              const label = sev === 'all' ? 'All' : sev.toUpperCase();
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition-all cursor-pointer ${
                    isActive
                      ? 'bg-background text-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/40'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Category Filter Dropdown */}
          {categories.length > 0 && (
            <div className="relative flex items-center">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-8 rounded-lg border border-border/80 bg-background/60 px-2.5 pr-7 text-xs font-mono text-foreground focus-visible:ring-1 focus-visible:ring-primary/40 outline-none cursor-pointer appearance-none"
              >
                <option value="all">All Categories ({categories.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronRight className="size-3 text-muted-foreground absolute right-2 pointer-events-none rotate-90" />
            </div>
          )}

          {/* Sort Selector */}
          <div className="relative flex items-center">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-8 rounded-lg border border-border/80 bg-background/60 px-2.5 pr-7 text-xs font-mono text-foreground focus-visible:ring-1 focus-visible:ring-primary/40 outline-none cursor-pointer appearance-none"
            >
              <option value="dollar">Sort: Financial Risk</option>
              <option value="severity">Sort: Highest Severity</option>
              <option value="default">Sort: Default Order</option>
            </select>
            <ArrowUpDown className="size-3 text-muted-foreground absolute right-2 pointer-events-none" />
          </div>
        </div>
      </div>

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
          <div className="p-12 text-center rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md">
            <CheckCircle className="size-10 text-emerald-500 mx-auto mb-2.5" />
            <h4 className="font-semibold text-sm text-foreground">No Discrepancies Found</h4>
            <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
              All ticket resolutions and asset inventory entries match the current filter criteria.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDiscrepancies.map((disc) => {
              const isHigh = disc.severity === 'HIGH';
              const isWarning = disc.severity === 'MEDIUM';

              return (
                <div 
                  key={disc.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 group hover:shadow-md ${
                    isHigh 
                      ? 'border-destructive/30 bg-card/90 hover:border-destructive/50' 
                      : isWarning 
                      ? 'border-amber-500/25 bg-card/90 hover:border-amber-500/40' 
                      : 'border-border/80 bg-card/90 hover:border-border'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    {/* Main Content Info */}
                    <div className="space-y-3 flex-1 min-w-0">
                      
                      {/* Ribbon: Severity, Category, Tag, Serial Number, Ticket */}
                      <div className="flex items-center space-x-2 flex-wrap gap-y-1.5">
                        {getSeverityBadge(disc.severity)}
                        
                        <span className="px-2 py-0.5 text-[10px] font-mono rounded-md border border-border/70 text-muted-foreground bg-muted/30">
                          {disc.category}
                        </span>

                        {disc.asset_tag && (
                          <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded-md bg-muted text-foreground border border-border">
                            {disc.asset_tag}
                          </span>
                        )}

                        {disc.serial_number && (
                          <button
                            type="button"
                            onClick={() => handleCopy(disc.serial_number!, disc.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted/40 hover:bg-muted px-2 py-0.5 rounded-md border border-border/70 transition-colors cursor-pointer"
                            title="Click to copy serial number"
                          >
                            <span>SN: {disc.serial_number}</span>
                            <Copy className="size-2.5 text-muted-foreground/60" />
                            {copiedId === disc.id && (
                              <span className="text-[9px] text-emerald-500 font-bold">Copied!</span>
                            )}
                          </button>
                        )}

                        {disc.ticket_id && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-medium rounded-md border border-primary/20 bg-primary/5 text-primary">
                            <Ticket className="size-3" />
                            <span>{disc.ticket_id}</span>
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h4 className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                          {disc.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {disc.description}
                        </p>
                      </div>

                      {/* Structured Seam Comparison / Consequence Panels */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="rounded-xl p-3 border border-destructive/20 bg-destructive/5 text-xs">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5 mb-1">
                            <AlertCircle className="size-3 shrink-0" />
                            Operational Consequence
                          </span>
                          <span className="text-foreground/90 leading-snug block text-xs">
                            {disc.consequence}
                          </span>
                        </div>

                        <div className="rounded-xl p-3 border border-primary/20 bg-primary/5 text-xs">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5 mb-1">
                            <Sparkles className="size-3 shrink-0" />
                            Suggested Seam Action
                          </span>
                          <span className="text-foreground/90 leading-snug block text-xs">
                            {disc.suggested_action}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Financial Risk Pill & Action Buttons */}
                    <div className="flex flex-col items-start lg:items-end justify-between self-stretch lg:min-w-[180px] pt-3 lg:pt-0 border-t lg:border-t-0 border-border/60 shrink-0">
                      {/* Financial Risk Header */}
                      <div className="text-left lg:text-right mb-3">
                        <span className="text-[10px] uppercase font-mono font-medium text-muted-foreground block tracking-wider">
                          Financial Exposure
                        </span>
                        <span className="text-xl font-bold text-destructive font-mono">
                          ${disc.dollar_risk.toLocaleString()}
                        </span>
                      </div>

                      {/* Clean Aligned Action Buttons Group */}
                      <div className="flex items-center gap-2 w-full lg:w-auto justify-start lg:justify-end mt-auto pt-2">
                        {/* Secondary Action: Inspect Asset */}
                        {disc.asset_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onSelectAsset(disc.asset_id!)}
                            className="h-8 px-3 text-xs font-medium gap-1.5 border-border/80 bg-background/60 hover:bg-muted text-foreground/90 hover:text-foreground transition-all cursor-pointer rounded-lg shadow-2xs"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="size-3.5 text-muted-foreground" />
                          </Button>
                        )}

                        {/* Primary Remediation Actions */}
                        {onRemediate && disc.id.startsWith('disc_orphan_') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'set_available', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xs ring-1 ring-emerald-400/20 rounded-lg transition-all cursor-pointer"
                            title="Move unassigned device to Available Storage Bay"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Set Available</span>
                          </Button>
                        )}

                        {onRemediate && disc.id.startsWith('disc_repair_') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'return_to_available', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xs ring-1 ring-emerald-400/20 rounded-lg transition-all cursor-pointer"
                            title="Return repaired device to available stock"
                          >
                            <CheckCircle2 className="size-3.5" />
                            <span>Return to Stock</span>
                          </Button>
                        )}

                        {onRemediate && (disc.id.startsWith('disc_warranty_') || disc.id.startsWith('disc_expired_')) && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRemediate({ action: 'create_refresh_ticket', discrepancy_id: disc.id, asset_id: disc.asset_id || undefined })}
                            className="h-8 px-3.5 text-xs font-semibold gap-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-xs ring-1 ring-amber-400/20 rounded-lg transition-all cursor-pointer"
                            title="Generate proactive hardware refresh ticket in ITSM"
                          >
                            <Zap className="size-3.5" />
                            <span>Create Ticket</span>
                          </Button>
                        )}

                        {onRemediate && disc.id.startsWith('disc_unlinked_log_') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onRemediate({ action: 'dismiss_unlinked', discrepancy_id: disc.id })}
                            className="h-8 px-3 text-xs font-medium border-border/80 hover:bg-muted/60 rounded-lg cursor-pointer"
                          >
                            <span>Dismiss</span>
                          </Button>
                        )}

                        {!disc.asset_id && !onRemediate && (
                          <span className="text-[10px] text-muted-foreground italic font-mono text-center">No actions</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
