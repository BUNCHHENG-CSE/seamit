import React from 'react';
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
  Command
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-13">
          {/* Logo & Brand Identity */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('radar')}>
            <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-xs font-bold shadow-xs">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>

            <div className="flex items-center space-x-2">
              <span className="font-heading font-semibold text-sm tracking-tight text-foreground">
                SeamIT
              </span>
              <Badge variant="outline" className="text-[10px] h-4 font-mono">
                ITSM ⇄ ITAM
              </Badge>
              <Badge variant="secondary" className="hidden sm:inline-flex text-[9px] h-4 font-mono text-muted-foreground">
                v2.4 Pro
              </Badge>
            </div>
          </div>

          {/* Quick Actions & Live Reconciler Indicator */}
          <div className="flex items-center space-x-2">
            {/* Command Palette Trigger */}
            {onOpenCommandPalette && (
              <button
                type="button"
                onClick={onOpenCommandPalette}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono text-muted-foreground bg-muted/50 hover:bg-muted border border-border rounded-md transition-colors"
                title="Open Command Palette (Ctrl+K or Cmd+K)"
              >
                <Command className="size-3" />
                <span className="text-[11px]">Command Palette</span>
                <kbd className="text-[9px] bg-background px-1 py-0.2 border border-border rounded">⌘K</kbd>
              </button>
            )}

            {/* Quick Barcode Scanner Button */}
            {onOpenScanner && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenScanner}
                className="hidden sm:inline-flex gap-1.5 h-7 text-xs font-mono"
                title="Physical Asset Barcode & QR Scanner"
              >
                <Scan className="size-3.5 text-primary" />
                <span>Quick Scan</span>
              </Button>
            )}

            {/* SOC 2 Compliance Report Button */}
            {onOpenComplianceReport && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenComplianceReport}
                className="hidden xl:inline-flex gap-1.5 h-7 text-xs font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                title="SOC 2 Type II & ISO 27001 Executive Device Custody Report"
              >
                <ShieldCheck className="size-3.5" />
                <span>SOC 2 Report</span>
              </Button>
            )}

            {/* Active Platform Pill */}
            <div className="hidden lg:flex items-center space-x-2 text-[11px] bg-muted/40 px-2.5 py-1 rounded-md border border-border text-muted-foreground font-mono">
              <span className="flex size-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full size-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-foreground">Reconciler Active</span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-[10px]">Jira + Freshservice + Zendesk</span>
            </div>

            {totalDiscrepancies > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setActiveTab('radar')}
                className="hidden sm:inline-flex gap-1.5 h-7 text-xs font-mono"
                title={`${totalDiscrepancies} seam discrepancies detected`}
              >
                <ShieldAlert className="size-3.5" />
                <span>{totalDiscrepancies} Discrepanc{totalDiscrepancies > 1 ? 'ies' : 'y'}</span>
              </Button>
            )}

            <Button
              variant="default"
              size="sm"
              onClick={onQuickSync}
              disabled={isSyncing}
              className="font-medium gap-1.5 h-7 text-xs font-mono"
            >
              <RefreshCw className={`size-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Reconciling...' : 'Run Lifecycle Sync'}</span>
            </Button>

            {/* Notification Bell */}
            {onOpenNotifications && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenNotifications}
                className="relative h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
                title={`${unreadAlertsCount} unread alerts`}
                aria-label="Open notifications"
              >
                <Bell className="size-3.5" />
                {unreadAlertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 size-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono animate-pulse">
                    {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                  </span>
                )}
              </Button>
            )}

            {/* Dark Mode / Light Mode Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="h-7 w-7 p-0 cursor-pointer text-muted-foreground hover:text-foreground"
              title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
              aria-label="Toggle dark/light theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="size-3.5 text-amber-400" />
              ) : (
                <Moon className="size-3.5 text-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Clean Segmented Navigation Bar */}
        <nav className="flex space-x-1 overflow-x-auto py-1.5 scrollbar-none border-t border-border/50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors cursor-pointer select-none font-mono ${
                  isActive
                    ? 'bg-muted text-foreground ring-1 ring-border font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className={`size-3.5 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <Badge variant="destructive" className="h-4 px-1 text-[9px] font-mono leading-none">
                    {tab.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
