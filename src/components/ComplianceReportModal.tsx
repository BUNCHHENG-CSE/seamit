import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Printer, Download, CheckCircle2, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { fetchSoc2Report, getSoc2HtmlUrl } from '../api';
import type { Soc2ComplianceSummary } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ComplianceReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<Soc2ComplianceSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchSoc2Report()
        .then(res => setData(res))
        .catch(err => console.error('Failed to load compliance report', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.open(getSoc2HtmlUrl(), '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto font-mono cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden my-6 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">SOC 2 & ISO 27001 Executive Device Custody Audit Report</h2>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  AUDIT READY
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Attestation record for Trust Services Criteria CC6.1 & ISO 27001 Control A.8.1
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              <Printer className="size-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors ml-1"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading || !data ? (
          <div className="py-20 text-center text-muted-foreground text-xs animate-pulse">
            Generating executive audit attestation report...
          </div>
        ) : (
          <div className="mt-5 space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-muted/30 border border-border rounded-lg">
                <div className="text-[11px] text-muted-foreground uppercase font-semibold">Audit Readiness</div>
                <div className="text-2xl font-extrabold text-emerald-500 mt-1">
                  {data.audit_readiness_score}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Scored against CC6.1</div>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-lg">
                <div className="text-[11px] text-muted-foreground uppercase font-semibold">Total Assets</div>
                <div className="text-2xl font-extrabold text-foreground mt-1">
                  {data.inventory_summary.total_assets}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{data.inventory_summary.in_use} active deployed</div>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-lg">
                <div className="text-[11px] text-muted-foreground uppercase font-semibold">Ghost Assets</div>
                <div className={`text-2xl font-extrabold mt-1 ${data.ghost_assets_count === 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {data.ghost_assets_count}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Unassigned in-use devices</div>
              </div>

              <div className="p-3.5 bg-muted/30 border border-border rounded-lg">
                <div className="text-[11px] text-muted-foreground uppercase font-semibold">Dollar Exposure</div>
                <div className={`text-2xl font-extrabold mt-1 ${data.dollar_risk_exposure === 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                  ${data.dollar_risk_exposure.toLocaleString()}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">Estimated risk value</div>
              </div>
            </div>

            {/* Attestation Statement */}
            <div className="p-4 bg-muted/20 border-l-4 border-primary rounded-r-lg">
              <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-1">
                Attestation & Scope
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {data.attestation_statement}
              </p>
              <div className="mt-2 text-[11px] text-muted-foreground flex flex-wrap gap-2">
                {data.standards.map((std, idx) => (
                  <span key={idx} className="bg-muted px-2 py-0.5 rounded border border-border/80">
                    {std}
                  </span>
                ))}
              </div>
            </div>

            {/* Inventory Distribution */}
            <div>
              <div className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">
                Inventory State Distribution
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">In Use</div>
                  <div className="text-base font-bold text-foreground mt-0.5">{data.inventory_summary.in_use}</div>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">Available</div>
                  <div className="text-base font-bold text-emerald-500 mt-0.5">{data.inventory_summary.available}</div>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">In Repair</div>
                  <div className="text-base font-bold text-amber-500 mt-0.5">{data.inventory_summary.in_repair}</div>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">Pending Return</div>
                  <div className="text-base font-bold text-sky-500 mt-0.5">{data.inventory_summary.pending_return}</div>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">Retired</div>
                  <div className="text-base font-bold text-muted-foreground mt-0.5">{data.inventory_summary.retired}</div>
                </div>
                <div className="p-2.5 bg-muted/20 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground">Lost/Stolen</div>
                  <div className="text-base font-bold text-red-500 mt-0.5">{data.inventory_summary.lost_stolen}</div>
                </div>
              </div>
            </div>

            {/* Custody Turnover Trail */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Device Custody Turnover Log (Recent 30 Days)
                </div>
                <span className="text-[11px] text-muted-foreground">{data.recent_custody_events.length} records verified</span>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 border-b border-border text-[11px] text-muted-foreground uppercase font-bold">
                    <tr>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Ticket</th>
                      <th className="p-2.5">Asset</th>
                      <th className="p-2.5">Custody Transition</th>
                      <th className="p-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {data.recent_custody_events.slice(0, 8).map((log) => (
                      <tr key={log.id} className="hover:bg-muted/20">
                        <td className="p-2.5 text-muted-foreground font-mono text-[11px]">
                          {log.timestamp ? log.timestamp.slice(0, 16).replace('T', ' ') : '—'}
                        </td>
                        <td className="p-2.5 font-bold text-foreground font-mono">{log.ticket_id || 'N/A'}</td>
                        <td className="p-2.5 font-mono text-primary">{log.asset_tag || '—'}</td>
                        <td className="p-2.5 text-foreground/80 truncate max-w-xs">{log.action_summary}</td>
                        <td className="p-2.5 text-right">
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">
                            {log.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-emerald-500" />
            <span>Cryptographically timestamped audit log ready for external inspection.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
