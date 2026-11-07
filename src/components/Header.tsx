import React, { useState, useRef, useEffect } from 'react';
import { 
  ShieldAlert, 
  Layers, 
  Workflow, 
  Radio, 
  History, 
  Settings, 
  Calculator,
  RefreshCw,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Scan,
  ShieldCheck,
  Search,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTheme } from '../context/useTheme';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onQuickSync: () => void;
  isSyncing: boolean;
  totalDiscrepancies: number;
  unreadAlertsCount?: number;
  onOpenNotifications?: () => void;
  onOpenScanner?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenComplianceReport?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onQuickSync,
  isSyncing,
  totalDiscrepancies,
  unreadAlertsCount = 0,
  onOpenNotifications,
  onOpenScanner,
  onOpenCommandPalette,
  onOpenComplianceReport
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setIsStatusMenuOpen(false);
      }
    }
    if (isStatusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusMenuOpen]);

  const tabs = [
    { id: 'radar', label: 'Discrepancy Radar', icon: ShieldAlert, badge: totalDiscrepancies },
    { id: 'assets', label: 'Asset Inventory', icon: Layers },
    { id: 'rules', label: 'Rule Engine', icon: Workflow },
    { id: 'simulator', label: 'Live Testbench', icon: Radio },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'connectors', label: 'ITSM Connectors', icon: Settings },
    { id: 'roi', label: 'SMB ROI & Pricing', icon: Calculator }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/70 shadow-xs transition-colors">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        
        {/* TOP ROW: Brand Identity, Command Search & Primary Actions */}
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-4">
          
          {/* Brand Identity */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none group shrink-0" 
            onClick={() => setActiveTab('radar')}
            title="TCT-SeamIT — Return to Discrepancy Radar"
          >
            <div className="relative flex size-8 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-violet-600 text-primary-foreground shadow-sm ring-1 ring-border/50 group-hover:scale-105 group-hover:shadow-primary/25 transition-all duration-200">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="font-heading font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors leading-tight">
                  TCT-SeamIT
                </span>
                <span className="text-[10px] text-muted-foreground font-mono leading-none hidden sm:inline">
                  ITSM ⇄ ITAM Seam Reconciler
                </span>
              </div>
              <Badge variant="outline" className="hidden md:inline-flex text-[9px] font-mono px-1.5 py-0 h-4 border-border/70 text-muted-foreground bg-muted/30">
                v2.4 Pro
              </Badge>
            </div>
          </div>

          {/* CENTER: Command Palette Search Bar */}
          {onOpenCommandPalette && (
            <div className="flex-1 max-w-md lg:max-w-lg xl:max-w-xl mx-2 hidden md:block">
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-mono text-muted-foreground bg-muted/40 hover:bg-muted/70 hover:text-foreground border border-border/80 hover:border-primary/40 rounded-lg transition-all duration-150 shadow-2xs group cursor-pointer"
                title="Open Global Command Palette (Ctrl+K or Cmd+K)"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Search className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  <span className="text-muted-foreground/80 group-hover:text-foreground text-[11px] truncate">
                    Search assets, trigger sync, run commands...
                  </span>
                </div>
                <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground bg-background border border-border/80 rounded shadow-2xs shrink-0">
                  ⌘K
                </kbd>
              </button>
            </div>
          )}

          {/* RIGHT: Status, Quick Actions & Utilities */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Mobile Search Button */}
            {onOpenCommandPalette && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenCommandPalette}
                className="md:hidden h-8 w-8 p-0 text-muted-foreground hover:text-foreground border-border/70"
                title="Search / Command Palette (⌘K)"
              >
                <Search className="size-3.5" />
              </Button>
            )}

            {/* Reconciler Status Pill with Interactive Dropdown */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => setIsStatusMenuOpen(prev => !prev)}
                className={`hidden lg:flex items-center gap-2 px-2.5 py-1 text-xs font-mono rounded-lg border transition-all cursor-pointer shadow-2xs ${
                  isStatusMenuOpen 
                    ? 'bg-muted border-primary/40 text-foreground' 
                    : 'bg-muted/30 hover:bg-muted/60 border-border/70 text-muted-foreground hover:text-foreground'
                }`}
                title="Reconciler Engine Status"
              >
                <span className="relative flex size-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                </span>
                <span className="font-medium text-[11px] text-foreground">Reconciler Live</span>
                <ChevronDown className={`size-3 text-muted-foreground transition-transform duration-150 ${isStatusMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Status Popover Dropdown */}
              {isStatusMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-64 p-3 bg-popover/95 backdrop-blur-md border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                    <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                      <Activity className="size-3.5 text-emerald-500" />
                      ITSM ⇄ ITAM Engine
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                      HEALTHY
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded hover:bg-muted/40 transition-colors">
                      <span className="text-foreground">Jira Service Management</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded hover:bg-muted/40 transition-colors">
                      <span className="text-foreground">Freshservice ITAM</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] py-1 px-1.5 rounded hover:bg-muted/40 transition-colors">
                      <span className="text-foreground">Zendesk Suite</span>
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500">
                        <CheckCircle2 className="size-3" /> Connected
                      </span>
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-border/60 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Mode: Bidirectional</span>
                    <button 
                      onClick={() => {
                        setIsStatusMenuOpen(false);
                        setActiveTab('connectors');
                      }}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Configure <ExternalLink className="size-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Barcode Scanner Button */}
            {onOpenScanner && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenScanner}
                className="hidden sm:inline-flex items-center gap-1.5 h-8 text-xs font-mono border-border/80 hover:bg-muted/60 transition-colors"
                title="Physical Asset Barcode & QR Scanner"
              >
                <Scan className="size-3.5 text-primary" />
                <span className="hidden xl:inline">Scan</span>
              </Button>
            )}

            {/* SOC 2 Compliance Report Button */}
            {onOpenComplianceReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenComplianceReport}
                className="hidden md:inline-flex items-center gap-1.5 h-8 text-xs font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500/50 transition-colors"
                title="SOC 2 Type II Device Custody & Audit Report"
              >
                <ShieldCheck className="size-3.5" />
                <span className="hidden xl:inline">SOC 2</span>
              </Button>
            )}

            {/* Discrepancy Pill Alert (if any discrepancies detected) */}
            {totalDiscrepancies > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('radar')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 h-8 text-xs font-mono font-medium text-destructive bg-destructive/10 hover:bg-destructive/20 border border-destructive/25 rounded-md transition-all cursor-pointer shadow-2xs"
                title={`${totalDiscrepancies} seam discrepancies detected. Click to view Radar.`}
              >
                <ShieldAlert className="size-3.5" />
                <span className="text-[11px] font-semibold">{totalDiscrepancies}</span>
                <span className="hidden sm:inline text-[11px]">Issues</span>
              </button>
            )}

            {/* Run Lifecycle Sync Button */}
            <Button
              variant="default"
              size="sm"
              onClick={onQuickSync}
              disabled={isSyncing}
              className="h-8 text-xs font-mono font-medium gap-1.5 px-3 shadow-2xs transition-all cursor-pointer"
              title="Trigger immediate bidirectional lifecycle sync"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Run Sync'}</span>
            </Button>

            {/* Notification Bell */}
            {onOpenNotifications && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNotifications}
                className="relative h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/50"
                title={`${unreadAlertsCount} unread alerts`}
                aria-label="Open notifications"
              >
                <Bell className="size-3.5" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono shadow-xs animate-pulse">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </Button>
            )}

            {/* Theme Switcher Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-8 w-8 p-0 cursor-pointer text-muted-foreground hover:text-foreground border-border/80 hover:bg-muted/50 transition-colors"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-3.5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="size-3.5 text-foreground hover:-rotate-12 transition-transform" />
              )}
            </Button>
          </div>
        </div>

        {/* BOTTOM ROW: Navigation Tabs Bar */}
        <div className="flex items-center justify-between border-t border-border/50 py-1.5 gap-2">
          <nav className="flex space-x-1 overflow-x-auto scrollbar-none py-0.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all duration-150 cursor-pointer select-none ${
                    isActive
                      ? 'bg-background text-foreground font-semibold shadow-xs border border-border/90'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <Icon className={`size-3.5 transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full text-[9px] font-mono font-bold bg-destructive text-destructive-foreground shadow-2xs">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Navigation Helper Pill */}
          <div className="hidden xl:flex items-center gap-2 text-[11px] font-mono text-muted-foreground/60 shrink-0 pr-1">
            <span className="size-1.5 rounded-full bg-emerald-500/70" />
            <span>Real-Time Seam Active</span>
          </div>
        </div>

      </div>
    </header>
  );
};
