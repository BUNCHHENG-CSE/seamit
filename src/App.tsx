'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Header } from './components/Header';
import { DiscrepancyRadar } from './components/DiscrepancyRadar';
import { AssetInventory } from './components/AssetInventory';

// Dynamically loaded heavy tabs and modals to optimize client bundle size
const RuleManager = dynamic(() => import('./components/RuleManager').then(m => m.RuleManager));
const WebhookSimulator = dynamic(() => import('./components/WebhookSimulator').then(m => m.WebhookSimulator));
const AuditLogViewer = dynamic(() => import('./components/AuditLogViewer').then(m => m.AuditLogViewer));
const ConnectorSettings = dynamic(() => import('./components/ConnectorSettings').then(m => m.ConnectorSettings));
const RoiCalculator = dynamic(() => import('./components/RoiCalculator').then(m => m.RoiCalculator));
const AssetDetailModal = dynamic(() => import('./components/AssetDetailModal').then(m => m.AssetDetailModal), { ssr: false });
const CsvImportModal = dynamic(() => import('./components/CsvImportModal').then(m => m.CsvImportModal), { ssr: false });
const CreateAssetModal = dynamic(() => import('./components/CreateAssetModal').then(m => m.CreateAssetModal), { ssr: false });
const OnboardingWizard = dynamic(() => import('./components/OnboardingWizard').then(m => m.OnboardingWizard), { ssr: false });
const AssetLabelModal = dynamic(() => import('./components/AssetLabelModal').then(m => m.AssetLabelModal), { ssr: false });
const AssetQuickScannerModal = dynamic(() => import('./components/AssetQuickScannerModal').then(m => m.AssetQuickScannerModal), { ssr: false });
const NotificationDrawer = dynamic(() => import('./components/NotificationDrawer').then(m => m.NotificationDrawer), { ssr: false });
const ComplianceReportModal = dynamic(() => import('./components/ComplianceReportModal').then(m => m.ComplianceReportModal), { ssr: false });
const CommandPaletteModal = dynamic(() => import('./components/CommandPaletteModal').then(m => m.CommandPaletteModal), { ssr: false });

import {
  fetchAssets,
  updateAsset,
  deleteAsset,
  createAsset,
  fetchRules,
  fetchRuleRecipes,
  createRule,
  updateRule,
  deleteRule,
  fetchSyncLogs,
  fetchDiscrepancyRadar,
  fetchConnectors,
  updateConnector,
  testConnector,
  fetchSimulatorTemplates,
  triggerSimulation,
  triggerLifecycleSync,
  remediateDiscrepancy,
  bulkUpdateAssets,
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  triggerTestAlert
} from './api';

import type { 
  Asset, 
  Rule, 
  Recipe, 
  SyncLog, 
  DiscrepancyRadarResponse, 
  ConnectorConfig, 
  SimulatorTemplate,
  NotificationItem,
  DiscrepancyRemediationRequest,
  BulkAssetUpdateRequest
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('radar');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [discrepancyData, setDiscrepancyData] = useState<DiscrepancyRadarResponse | null>(null);
  const [connectors, setConnectors] = useState<ConnectorConfig[]>([]);
  const [simulatorTemplates, setSimulatorTemplates] = useState<SimulatorTemplate[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);

  // Modals & Drawers
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isCreateAssetOpen, setIsCreateAssetOpen] = useState(false);
  const [isImportCsvOpen, setIsImportCsvOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isComplianceReportOpen, setIsComplianceReportOpen] = useState(false);
  const [labelModalAssets, setLabelModalAssets] = useState<Asset[] | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = useCallback(async () => {
    try {
      const [
        assetsData,
        rulesData,
        recipesData,
        logsData,
        radarData,
        connectorsData,
        templatesData,
        notifsData
      ] = await Promise.all([
        fetchAssets(),
        fetchRules(),
        fetchRuleRecipes(),
        fetchSyncLogs(50),
        fetchDiscrepancyRadar(),
        fetchConnectors(),
        fetchSimulatorTemplates(),
        fetchNotifications(30)
      ]);

      setAssets(assetsData);
      setRules(rulesData);
      setRecipes(recipesData);
      setLogs(logsData);
      setDiscrepancyData(radarData);
      setConnectors(connectorsData);
      setSimulatorTemplates(templatesData);
      setNotifications(notifsData.notifications);
      setUnreadAlertsCount(notifsData.unread_count);
    } catch (err) {
      console.error('Error loading initial data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadAllData();
    })();
  }, [loadAllData]);

  // Global Keyboard Shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handlers
  const handleQuickSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerLifecycleSync();
      await loadAllData();
      showToast(`2-Way Sync Complete! Created ${res.tickets_created_count || 0} proactive lifecycle ticket(s).`);
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectAssetById = (assetId: number) => {
    const found = assets.find(a => a.id === assetId);
    if (found) {
      setSelectedAsset(found);
      setActiveTab('assets');
    }
  };

  const handleSaveAsset = async (id: number, updates: Partial<Asset>) => {
    await updateAsset(id, updates);
    await loadAllData();
    showToast('Asset updated successfully.');
  };

  const handleDeleteAsset = async (id: number) => {
    await deleteAsset(id);
    await loadAllData();
    showToast('Asset deleted.');
  };

  const handleCreateAsset = async (asset: Partial<Asset>) => {
    await createAsset(asset);
    await loadAllData();
    showToast('New asset added to inventory.');
  };

  const handleToggleRule = async (id: string, isEnabled: boolean) => {
    await updateRule(id, { is_enabled: isEnabled });
    setRules(prev => prev.map(r => r.id === id ? { ...r, is_enabled: isEnabled } : r));
    showToast(`Rule ${isEnabled ? 'enabled' : 'disabled'}.`);
  };

  const handleApplyRecipe = async (recipe: Recipe) => {
    const ruleId = `rule_${recipe.id.replace('recipe_', '')}_${Date.now()}`;
    await createRule({
      id: ruleId,
      name: recipe.name,
      description: recipe.description,
      source: recipe.source,
      direction: recipe.direction,
      event_type: recipe.event_type,
      conditions: recipe.conditions,
      actions: recipe.actions,
      is_enabled: true
    });
    await loadAllData();
    setActiveTab('rules');
    showToast(`Recipe '${recipe.name}' installed into active rules!`);
  };

  const handleCreateRule = async (rule: Partial<Rule>) => {
    await createRule(rule);
    await loadAllData();
    showToast('Custom automation rule created.');
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this rule?')) {
      await deleteRule(id);
      await loadAllData();
      showToast('Rule deleted.');
    }
  };

  const handleTriggerSimulation = async (source: string, payload: Record<string, any>) => {
    const res = await triggerSimulation(source, payload);
    await loadAllData();
    return res;
  };

  const handleUpdateConnector = async (id: string, updates: Partial<ConnectorConfig>) => {
    await updateConnector(id, updates);
    await loadAllData();
    showToast(`${id.toUpperCase()} connector settings saved.`);
  };

  const handleTestConnector = async (id: string) => {
    return await testConnector(id);
  };

  const handleExportCsv = () => {
    window.open('/api/assets/export-csv', '_blank');
  };

  const handleExportCompliance = () => {
    window.open('/api/logs/export-compliance', '_blank');
  };

  // Feature: Discrepancy Remediation
  const handleRemediateDiscrepancy = async (payload: DiscrepancyRemediationRequest) => {
    try {
      const res = await remediateDiscrepancy(payload);
      await loadAllData();
      showToast(res.message || 'Discrepancy remediated.');
    } catch (err: any) {
      showToast(`Remediation failed: ${err.message}`);
    }
  };

  // Feature: Asset Bulk Operations
  const handleBulkUpdateAssets = async (payload: BulkAssetUpdateRequest) => {
    try {
      const res = await bulkUpdateAssets(payload);
      await loadAllData();
      showToast(res.message || 'Batch update complete.');
    } catch (err: any) {
      showToast(`Bulk update failed: ${err.message}`);
    }
  };

  // Feature: Quick Status update from scanner
  const handleQuickUpdateStatus = async (assetId: number, status: Asset['status'], location?: string) => {
    const updates: Partial<Asset> = { status };
    if (location) updates.location = location;
    await updateAsset(assetId, updates);
    await loadAllData();
    showToast(`Asset status changed to ${status}.`);
  };

  // Feature: Notifications
  const handleMarkNotificationRead = async (id: number) => {
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    setUnreadAlertsCount(prev => Math.max(0, prev - 1));
  };

  const handleMarkAllNotificationsRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    setUnreadAlertsCount(0);
    showToast('All notifications marked as read.');
  };

  const handleSendTestAlert = async () => {
    await triggerTestAlert({
      title: 'Manual Alert Test',
      message: 'Testing outbound Slack / Teams notification webhook dispatcher from TCT-SeamIT.',
      severity: 'INFO'
    });
    await loadAllData();
    showToast('Test notification sent & dispatched.');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-primary selection:text-primary-foreground relative overflow-x-hidden">
      {/* Subtle grid pattern */}
      <div className="fixed inset-0 bg-mesh-pattern pointer-events-none z-0 opacity-40" />

      {/* Modern Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-card text-foreground border border-border shadow-2xl text-xs font-mono px-3.5 py-2.5 rounded-lg flex items-center gap-2.5 backdrop-blur-xl animate-bounce">
          <div className="size-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="leading-snug">{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onQuickSync={handleQuickSync}
        isSyncing={isSyncing}
        totalDiscrepancies={discrepancyData?.summary?.total_discrepancies || 0}
        unreadAlertsCount={unreadAlertsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenComplianceReport={() => setIsComplianceReportOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 relative z-10">
        {/* Onboarding Wizard Card */}
        <OnboardingWizard
          onNavigateTab={setActiveTab}
          discrepancyCount={discrepancyData?.summary?.total_discrepancies || 0}
          assetsCount={assets.length}
        />

        {activeTab === 'radar' && (
          <DiscrepancyRadar
            data={discrepancyData}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onSelectAsset={handleSelectAssetById}
            onTriggerLifecycle={handleQuickSync}
            onRemediate={handleRemediateDiscrepancy}
          />
        )}

        {activeTab === 'assets' && (
          <AssetInventory
            assets={assets}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onSelectAsset={(asset) => setSelectedAsset(asset)}
            onOpenCreate={() => setIsCreateAssetOpen(true)}
            onOpenImport={() => setIsImportCsvOpen(true)}
            onExportCsv={handleExportCsv}
            onBulkUpdate={handleBulkUpdateAssets}
            onOpenLabelModal={(selected) => setLabelModalAssets(selected)}
          />
        )}

        {activeTab === 'rules' && (
          <RuleManager
            rules={rules}
            recipes={recipes}
            isLoading={isLoading}
            onToggleRule={handleToggleRule}
            onApplyRecipe={handleApplyRecipe}
            onCreateRule={handleCreateRule}
            onDeleteRule={handleDeleteRule}
          />
        )}

        {activeTab === 'simulator' && (
          <WebhookSimulator
            templates={simulatorTemplates}
            onTriggerSimulation={handleTriggerSimulation}
            onRefreshData={loadAllData}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogViewer
            logs={logs}
            isLoading={isLoading}
            onRefresh={loadAllData}
            onExportCompliance={handleExportCompliance}
          />
        )}

        {activeTab === 'connectors' && (
          <ConnectorSettings
            connectors={connectors}
            isLoading={isLoading}
            onUpdateConnector={handleUpdateConnector}
            onTestConnector={handleTestConnector}
          />
        )}

        {activeTab === 'roi' && (
          <RoiCalculator />
        )}
      </main>

      {/* Modals & Drawers */}
      <AssetDetailModal
        asset={selectedAsset}
        isOpen={!!selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onSave={handleSaveAsset}
        onDelete={handleDeleteAsset}
      />

      <CreateAssetModal
        isOpen={isCreateAssetOpen}
        onClose={() => setIsCreateAssetOpen(false)}
        onCreate={handleCreateAsset}
      />

      <CsvImportModal
        isOpen={isImportCsvOpen}
        onClose={() => setIsImportCsvOpen(false)}
        onSuccess={loadAllData}
      />

      {/* Feature 2 & 3: Asset Barcode & QR Label Printing Modal */}
      <AssetLabelModal
        assets={labelModalAssets || []}
        isOpen={!!labelModalAssets && labelModalAssets.length > 0}
        onClose={() => setLabelModalAssets(null)}
      />

      {/* Feature 3: Physical Scanner Modal */}
      <AssetQuickScannerModal
        assets={assets}
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSelectAsset={(asset) => {
          setSelectedAsset(asset);
          setActiveTab('assets');
        }}
        onQuickUpdateStatus={handleQuickUpdateStatus}
      />

      {/* Feature 5: Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        unreadCount={unreadAlertsCount}
        onMarkRead={handleMarkNotificationRead}
        onMarkAllRead={handleMarkAllNotificationsRead}
        onSendTestAlert={handleSendTestAlert}
        onNavigateTab={setActiveTab}
      />

      {/* Feature 6: SOC 2 Compliance Report Modal */}
      <ComplianceReportModal
        isOpen={isComplianceReportOpen}
        onClose={() => setIsComplianceReportOpen(false)}
      />

      {/* Feature 8: Global Command Palette */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        assets={assets}
        onNavigateTab={setActiveTab}
        onSelectAsset={(asset) => {
          setSelectedAsset(asset);
          setActiveTab('assets');
        }}
        onQuickSync={handleQuickSync}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenReport={() => setIsComplianceReportOpen(true)}
        onOpenImportCsv={() => setIsImportCsvOpen(true)}
        onExportCsv={handleExportCsv}
        onRemediateAll={() => handleRemediateDiscrepancy({ action: 'remediate_all_low_hanging' })}
      />

      {/* Modern Footer */}
      <footer className="border-t border-border bg-card/60 backdrop-blur py-4 text-center text-xs text-muted-foreground relative z-10 font-mono">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">TCT-SeamIT</span>
            <span>•</span>
            <span>Automated Bridge Between SMB Ticketing & ITAM</span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>SOC 2 Ready</span>
            </span>
            <span>•</span>
            <span>Jira • Freshservice • Zendesk</span>
            <span>•</span>
            <span>Anchored at $99–$199/mo</span>
            <span>•</span>
            <span className="text-muted-foreground/60">v2.4 Pro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
