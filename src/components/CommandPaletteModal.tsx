import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Laptop, Radar, Sliders, Play, FileText, Printer, Scan, Download, Upload, Zap, ShieldCheck, ArrowRight } from 'lucide-react';
import type { Asset } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  onNavigateTab: (tab: string) => void;
  onSelectAsset: (asset: Asset) => void;
  onQuickSync: () => void;
  onOpenScanner: () => void;
  onOpenReport: () => void;
  onOpenImportCsv: () => void;
  onExportCsv: () => void;
  onRemediateAll: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({
  isOpen,
  onClose,
  assets,
  onNavigateTab,
  onSelectAsset,
  onQuickSync,
  onOpenScanner,
  onOpenReport,
  onOpenImportCsv,
  onExportCsv,
  onRemediateAll
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Keyboard shortcut listener for Escape and Ctrl+K / Cmd+K
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Filter actions and navigation
  const staticCommands = [
    {
      id: 'nav_radar',
      category: 'Navigation',
      title: 'Discrepancy Radar & Audit Score',
      desc: 'View ghost assets, zombie repairs & compliance risks',
      icon: Radar,
      action: () => onNavigateTab('radar')
    },
    {
      id: 'nav_assets',
      category: 'Navigation',
      title: 'Asset Inventory & Hardware Table',
      desc: 'View all laptops, serials, and custody statuses',
      icon: Laptop,
      action: () => onNavigateTab('assets')
    },
    {
      id: 'nav_rules',
      category: 'Navigation',
      title: 'Automation Rules & Recipe Library',
      desc: 'Manage Trigger-Condition-Action sync recipes',
      icon: Sliders,
      action: () => onNavigateTab('rules')
    },
    {
      id: 'nav_simulator',
      category: 'Navigation',
      title: 'Interactive Webhook Simulator',
      desc: 'Simulate Jira, Freshservice & Zendesk events',
      icon: Play,
      action: () => onNavigateTab('simulator')
    },
    {
      id: 'nav_audit',
      category: 'Navigation',
      title: 'Immutable Audit Trail & Proof Log',
      desc: 'Inspect before/after JSON diffs for all syncs',
      icon: FileText,
      action: () => onNavigateTab('audit')
    },
    {
      id: 'act_scan',
      category: 'Quick Actions',
      title: 'Physical Asset Quick Scanner',
      desc: 'Scan barcode/QR gun or lookup asset tag instantly',
      icon: Scan,
      action: () => onOpenScanner()
    },
    {
      id: 'act_report',
      category: 'Quick Actions',
      title: 'SOC 2 & ISO 27001 Executive Audit Report',
      desc: 'Print or export device custody attestation PDF',
      icon: ShieldCheck,
      action: () => onOpenReport()
    },
    {
      id: 'act_sync',
      category: 'Quick Actions',
      title: 'Trigger Proactive 2-Way Sync',
      desc: 'Scan expiring warranties and create draft tickets',
      icon: Zap,
      action: () => onQuickSync()
    },
    {
      id: 'act_remediate',
      category: 'Quick Actions',
      title: '1-Click Auto-Remediate Discrepancies',
      desc: 'Batch-fix all orphaned ghost assets and zombie repairs',
      icon: Zap,
      action: () => onRemediateAll()
    },
    {
      id: 'act_import',
      category: 'Quick Actions',
      title: 'Import Assets from CSV Spreadsheet',
      desc: 'Bulk import from Excel, Google Sheets, or Snipe-IT',
      icon: Upload,
      action: () => onOpenImportCsv()
    },
    {
      id: 'act_export',
      category: 'Quick Actions',
      title: 'Export Asset Inventory CSV Backup',
      desc: 'Download full CSV snapshot of current assets',
      icon: Download,
      action: () => onExportCsv()
    }
  ];

  const q = search.trim().toLowerCase();

  const filteredCommands = staticCommands.filter(c =>
    c.title.toLowerCase().includes(q) ||
    c.desc.toLowerCase().includes(q) ||
    c.category.toLowerCase().includes(q)
  );

  const matchedAssets = q
    ? assets.filter(a =>
        a.asset_tag.toLowerCase().includes(q) ||
        a.serial_number.toLowerCase().includes(q) ||
        a.model.toLowerCase().includes(q) ||
        (a.assigned_to_name && a.assigned_to_name.toLowerCase().includes(q))
      ).slice(0, 5)
    : [];

  const totalResults = [...filteredCommands, ...matchedAssets];

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, totalResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + totalResults.length) % Math.max(1, totalResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (totalResults.length > 0) {
        const item = totalResults[selectedIndex];
        if ('action' in item) {
          (item as any).action();
          onClose();
        } else {
          onSelectAsset(item as Asset);
          onClose();
        }
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-background/80 backdrop-blur-sm font-mono cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="relative border-b border-border flex items-center px-4 py-3 bg-muted/20">
          <Search className="size-4 text-muted-foreground mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownInInput}
            placeholder="Search assets, actions, or jump to tabs (e.g. 'ASSET-1001', 'scan', 'report')..."
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground text-sm focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            title="Close (ESC)"
            className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 border border-border rounded font-mono ml-2 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
          >
            <span>ESC</span>
            <X className="size-3" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {/* Matched Assets Group */}
          {matchedAssets.length > 0 && (
            <div className="mb-2">
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Matching Assets
              </div>
              {matchedAssets.map((asset, idx) => {
                const itemIndex = filteredCommands.length + idx;
                const isSelected = selectedIndex === itemIndex;
                return (
                  <div
                    key={asset.id}
                    onClick={() => {
                      onSelectAsset(asset);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(itemIndex)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Laptop className="size-4 shrink-0" />
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>{asset.asset_tag}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono uppercase ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {asset.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className={`text-[11px] truncate ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {asset.model} • S/N: {asset.serial_number} {asset.assigned_to_name ? `• ${asset.assigned_to_name}` : ''}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-3.5 opacity-60" />
                  </div>
                );
              })}
            </div>
          )}

          {/* Commands Group */}
          {filteredCommands.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                Navigation & Quick Actions
              </div>
              {filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = selectedIndex === idx;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/50'}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 shrink-0" />
                      <div>
                        <div className="font-bold">{cmd.title}</div>
                        <div className={`text-[11px] ${isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                          {cmd.desc}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {cmd.category}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {totalResults.length === 0 && (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No results found for "{search}".
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 hover:text-foreground cursor-pointer transition-colors"
              title="Close (ESC)"
            >
              <kbd className="px-1 py-0.2 bg-muted border border-border rounded text-[10px]">ESC</kbd>
              <span>Close</span>
            </button>
          </div>
          <span className="text-primary font-bold">TCT-SeamIT v2.4 Pro</span>
        </div>
      </div>
    </div>
  );
};
