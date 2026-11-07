import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Upload, 
  Download, 
  RefreshCw,
  Laptop, 
  Monitor, 
  Smartphone, 
  Server,
  AlertCircle, 
  Clock, 
  MapPin, 
  Copy, 
  Check, 
  LayoutGrid, 
  List, 
  ChevronRight, 
  Ticket, 
  ShieldCheck,
  HardDrive,
  QrCode,
  Printer,
  Trash2,
  Tag,
  CheckSquare,
  Square
} from 'lucide-react';
import type { Asset, BulkAssetUpdateRequest } from '../types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableHead, 
  TableRow, 
  TableCell 
} from '@/components/ui/table';

interface AssetInventoryProps {
  assets: Asset[];
  isLoading: boolean;
  onRefresh: () => void;
  onSelectAsset: (asset: Asset) => void;
  onOpenCreate: () => void;
  onOpenImport: () => void;
  onExportCsv: () => void;
  onBulkUpdate?: (payload: BulkAssetUpdateRequest) => Promise<void>;
  onOpenLabelModal?: (assets: Asset[]) => void;
}

const TODAY_MS = Date.now();

export const AssetInventory: React.FC<AssetInventoryProps> = ({
  assets,
  isLoading,
  onRefresh,
  onSelectAsset,
  onOpenCreate,
  onOpenImport,
  onExportCsv,
  onBulkUpdate,
  onOpenLabelModal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('grid');
  const [sortBy, setSortBy] = useState<'tag' | 'model' | 'warranty' | 'recent'>('recent');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [isBatchUpdating, setIsBatchUpdating] = useState(false);

  const toggleSelectAsset = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setSelectedAssetIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedAssetIds.length === filteredAssets.length) {
      setSelectedAssetIds([]);
    } else {
      setSelectedAssetIds(filteredAssets.map(a => a.id));
    }
  };

  const handleBatchStatus = async (status: string) => {
    if (!onBulkUpdate || selectedAssetIds.length === 0) return;
    setIsBatchUpdating(true);
    try {
      await onBulkUpdate({
        asset_ids: selectedAssetIds,
        status,
        action: 'update'
      });
      setSelectedAssetIds([]);
      onRefresh();
    } finally {
      setIsBatchUpdating(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!onBulkUpdate || selectedAssetIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedAssetIds.length} assets? This action cannot be undone.`)) {
      setIsBatchUpdating(true);
      try {
        await onBulkUpdate({
          asset_ids: selectedAssetIds,
          action: 'delete'
        });
        setSelectedAssetIds([]);
        onRefresh();
      } finally {
        setIsBatchUpdating(false);
      }
    }
  };

  const selectedAssets = useMemo(() => {
    return assets.filter(a => selectedAssetIds.includes(a.id));
  }, [assets, selectedAssetIds]);

  const statusOptions = [
    { id: 'all', label: 'All Statuses' },
    { id: 'in_use', label: 'In Use (Deployed)' },
    { id: 'available', label: 'Available (Stock)' },
    { id: 'in_repair', label: 'In Repair' },
    { id: 'pending_return', label: 'Pending Return' },
    { id: 'retired', label: 'Retired' },
    { id: 'lost_stolen', label: 'Lost / Stolen' },
  ];

  const categories = [
    { id: 'all', label: 'All Categories', icon: HardDrive },
    { id: 'laptop', label: 'Laptops', icon: Laptop },
    { id: 'desktop', label: 'Desktops', icon: Monitor },
    { id: 'mobile', label: 'Mobile', icon: Smartphone },
    { id: 'server', label: 'Servers', icon: Server },
  ];

  const stats = useMemo(() => {
    return {
      total: assets.length,
      inUse: assets.filter(a => a.status === 'in_use').length,
      available: assets.filter(a => a.status === 'available').length,
      inRepair: assets.filter(a => a.status === 'in_repair').length,
      attention: assets.filter(a => a.status === 'pending_return' || a.status === 'lost_stolen').length,
    };
  }, [assets]);

  const handleCopy = (e: React.MouseEvent, key: string, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const filteredAssets = useMemo(() => {
    return assets
      .filter(asset => {
        const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;
        const matchesCategory = categoryFilter === 'all' || asset.category.toLowerCase().includes(categoryFilter.toLowerCase());
        
        const q = searchTerm.toLowerCase();
        const matchesSearch = !q || (
          asset.asset_tag.toLowerCase().includes(q) ||
          asset.serial_number.toLowerCase().includes(q) ||
          asset.model.toLowerCase().includes(q) ||
          (asset.assigned_to_name && asset.assigned_to_name.toLowerCase().includes(q)) ||
          (asset.assigned_to_email && asset.assigned_to_email.toLowerCase().includes(q)) ||
          (asset.location && asset.location.toLowerCase().includes(q)) ||
          (asset.last_ticket_id && asset.last_ticket_id.toLowerCase().includes(q))
        );

        return matchesStatus && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'tag') return a.asset_tag.localeCompare(b.asset_tag);
        if (sortBy === 'model') return a.model.localeCompare(b.model);
        if (sortBy === 'warranty') {
          const dateA = a.warranty_expiry_date ? new Date(a.warranty_expiry_date).getTime() : 0;
          const dateB = b.warranty_expiry_date ? new Date(b.warranty_expiry_date).getTime() : 0;
          return dateA - dateB;
        }
        return b.id - a.id;
      });
  }, [assets, statusFilter, categoryFilter, searchTerm, sortBy]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_use':
        return (
          <Badge variant="outline" className="h-5 gap-1 text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20">
            <span className="size-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span>In Use</span>
          </Badge>
        );
      case 'available':
        return (
          <Badge variant="outline" className="h-5 gap-1 text-[10px] font-mono text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/20">
            <span className="size-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
            <span>Available</span>
          </Badge>
        );
      case 'in_repair':
        return (
          <Badge variant="secondary" className="h-5 gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
            <span className="size-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span>In Repair</span>
          </Badge>
        );
      case 'pending_return':
        return (
          <Badge variant="destructive" className="h-5 gap-1 text-[10px] font-mono">
            <span className="size-1.5 rounded-full bg-destructive animate-pulse" />
            <span>Pending Return</span>
          </Badge>
        );
      case 'retired':
        return (
          <Badge variant="outline" className="h-5 text-[10px] font-mono text-muted-foreground">
            Retired
          </Badge>
        );
      case 'lost_stolen':
        return (
          <Badge variant="destructive" className="h-5 gap-1 text-[10px] font-mono">
            <span className="size-1.5 rounded-full bg-destructive animate-ping" />
            <span>Lost / Stolen</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="h-5 text-[10px] font-mono">
            {status}
          </Badge>
        );
    }
  };

  const getWarrantyInfo = (warrantyDate: string | null) => {
    if (!warrantyDate) return <span className="text-muted-foreground text-xs font-mono">—</span>;
    try {
      const exp = new Date(warrantyDate);
      const diffDays = Math.ceil((exp.getTime() - TODAY_MS) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return (
          <Badge variant="destructive" className="h-5 gap-1 text-[10px] font-mono">
            <AlertCircle className="size-3" />
            <span>Expired ({Math.abs(diffDays)}d)</span>
          </Badge>
        );
      } else if (diffDays <= 60) {
        return (
          <Badge variant="secondary" className="h-5 gap-1 text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20">
            <Clock className="size-3" />
            <span>{diffDays}d left</span>
          </Badge>
        );
      } else {
        return (
          <span className="text-xs font-mono text-foreground/80 inline-flex items-center space-x-1">
            <ShieldCheck className="size-3 text-emerald-600 dark:text-emerald-400" />
            <span>{warrantyDate}</span>
          </span>
        );
      }
    } catch {
      return <span className="text-xs font-mono text-muted-foreground">{warrantyDate}</span>;
    }
  };

  const getCategoryIcon = (category: string) => {
    const c = category.toLowerCase();
    if (c.includes('desktop') || c.includes('optiplex')) return <Monitor className="w-4 h-4 text-cyan-400" />;
    if (c.includes('phone') || c.includes('mobile')) return <Smartphone className="w-4 h-4 text-emerald-400" />;
    if (c.includes('server') || c.includes('network')) return <Server className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-indigo-400" />;
  };

  return (
    <div className="space-y-5">
      {/* Quick Summary KPI Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <Card 
          onClick={() => { setStatusFilter('all'); setCategoryFilter('all'); }}
          className={`p-3 border-border transition-colors cursor-pointer ${
            statusFilter === 'all' && categoryFilter === 'all' ? 'border-primary bg-muted/60' : 'bg-card hover:border-foreground/20'
          }`}
        >
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Total Assets</span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{stats.total}</span>
        </Card>

        <Card 
          onClick={() => setStatusFilter('in_use')}
          className={`p-3 border-border transition-colors cursor-pointer ${
            statusFilter === 'in_use' ? 'border-emerald-500 bg-emerald-500/10' : 'bg-card hover:border-foreground/20'
          }`}
        >
          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">In Use</span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{stats.inUse}</span>
        </Card>

        <Card 
          onClick={() => setStatusFilter('available')}
          className={`p-3 border-border transition-colors cursor-pointer ${
            statusFilter === 'available' ? 'border-sky-500 bg-sky-500/10' : 'bg-card hover:border-foreground/20'
          }`}
        >
          <span className="text-[10px] font-mono text-sky-600 dark:text-sky-400 uppercase tracking-wider block">Available</span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{stats.available}</span>
        </Card>

        <Card 
          onClick={() => setStatusFilter('in_repair')}
          className={`p-3 border-border transition-colors cursor-pointer ${
            statusFilter === 'in_repair' ? 'border-amber-500 bg-amber-500/10' : 'bg-card hover:border-foreground/20'
          }`}
        >
          <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 uppercase tracking-wider block">In Repair</span>
          <span className="text-xl font-bold font-mono text-foreground mt-0.5 block">{stats.inRepair}</span>
        </Card>

        <Card 
          onClick={() => setStatusFilter('pending_return')}
          className={`p-3 border-border transition-colors cursor-pointer col-span-2 sm:col-span-1 ${
            statusFilter === 'pending_return' ? 'border-destructive bg-destructive/10' : 'bg-card hover:border-foreground/20'
          }`}
        >
          <span className="text-[10px] font-mono text-destructive uppercase tracking-wider block">Needs Action</span>
          <span className="text-xl font-bold font-mono text-destructive mt-0.5 block">{stats.attention}</span>
        </Card>
      </div>

      {/* Control Toolbar: Search, Filters, View Switch, Actions */}
      <Card className="p-3 border-border bg-card/60 space-y-2.5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-3.5 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tag, serial, model, user, email, or ticket..."
              className="pl-8 h-7 text-xs font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="h-7 w-7 p-0"
              title="Refresh Asset Inventory"
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin text-primary' : ''}`} />
            </Button>

            {/* View Switcher */}
            <div className="flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Visual Card Grid View"
              >
                <LayoutGrid className="size-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Dense Table View"
              >
                <List className="size-3.5" />
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImport}
              className="h-7 text-xs font-mono gap-1"
            >
              <Upload className="size-3" />
              <span>Import</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExportCsv}
              className="h-7 text-xs font-mono gap-1"
            >
              <Download className="size-3" />
              <span>Export</span>
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={onOpenCreate}
              className="h-7 text-xs font-mono font-medium gap-1"
            >
              <Plus className="size-3" />
              <span>New Asset</span>
            </Button>
          </div>
        </div>

        {/* Secondary Filters: Category Chips & Status Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-border/60">
          {/* Category Chips */}
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none py-0.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = categoryFilter === cat.id;
              return (
                <Button
                  key={cat.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(cat.id)}
                  className="h-6 px-2 text-[11px] font-mono gap-1"
                >
                  <Icon className="size-3" />
                  <span>{cat.label}</span>
                </Button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-6 bg-muted/40 border border-input rounded-md text-xs text-foreground px-2 focus:outline-none focus:border-ring cursor-pointer font-mono"
            >
              {statusOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-6 bg-muted/40 border border-input rounded-md text-xs text-foreground px-2 focus:outline-none focus:border-ring cursor-pointer font-mono"
            >
              <option value="recent">Recently Added</option>
              <option value="tag">Asset Tag (A–Z)</option>
              <option value="model">Model Name</option>
              <option value="warranty">Warranty Expiry</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Asset Count Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
        <div className="flex items-center gap-3">
          <span>
            Showing <strong className="text-foreground">{filteredAssets.length}</strong> of {assets.length} total endpoints
          </span>
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-primary hover:underline font-medium cursor-pointer flex items-center gap-1 text-[11px]"
          >
            {selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0 ? (
              <>
                <CheckSquare className="size-3" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square className="size-3" />
                <span>Select All ({filteredAssets.length})</span>
              </>
            )}
          </button>
        </div>

        {(statusFilter !== 'all' || categoryFilter !== 'all' || searchTerm) && (
          <button 
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
              setSearchTerm('');
            }}
            className="text-primary hover:underline font-medium cursor-pointer"
          >
            Clear active filters
          </button>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="sticky top-14 z-30 p-3 bg-card border-2 border-primary/60 rounded-xl shadow-xl flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-150 font-mono">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary animate-ping" />
            <span className="text-xs font-bold text-foreground">
              {selectedAssetIds.length} asset{selectedAssetIds.length > 1 ? 's' : ''} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedAssetIds([])}
              className="text-[11px] text-muted-foreground hover:text-foreground underline ml-1 cursor-pointer"
            >
              Deselect All
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Batch Status dropdown */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground text-[11px]">Set Status:</span>
              <select
                disabled={isBatchUpdating}
                onChange={(e) => {
                  if (e.target.value) {
                    handleBatchStatus(e.target.value);
                    e.target.value = '';
                  }
                }}
                defaultValue=""
                className="h-7 bg-muted border border-input rounded-md text-xs text-foreground px-2 focus:outline-none cursor-pointer"
              >
                <option value="" disabled>Change status...</option>
                <option value="available">Available (Stock)</option>
                <option value="in_use">In Use (Deployed)</option>
                <option value="in_repair">In Repair</option>
                <option value="pending_return">Pending Return</option>
                <option value="retired">Retired / E-Waste</option>
              </select>
            </div>

            {/* Print QR Labels */}
            {onOpenLabelModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenLabelModal(selectedAssets)}
                className="h-7 text-xs font-mono gap-1.5"
                title="Print Barcode & QR Stickers for selected devices"
              >
                <Printer className="size-3.5" />
                <span>Print Labels ({selectedAssetIds.length})</span>
              </Button>
            )}

            {/* Batch Delete */}
            <Button
              variant="destructive"
              size="sm"
              disabled={isBatchUpdating}
              onClick={handleBatchDelete}
              className="h-7 text-xs font-mono gap-1.5"
              title="Delete selected assets from database"
            >
              <Trash2 className="size-3.5" />
              <span>Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: MODERN HARDWARE CARDS GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredAssets.length === 0 ? (
            <Card className="col-span-full p-12 text-center border-border">
              <HardDrive className="size-10 text-muted-foreground mx-auto mb-2" />
              <h4 className="font-heading font-medium text-sm text-foreground">No Assets Found</h4>
              <p className="text-xs text-muted-foreground mt-1">No IT assets match your current search and filter settings.</p>
            </Card>
          ) : (
            filteredAssets.map((asset) => {
              const isCopied = copiedKey === `tag-${asset.id}`;
              return (
                <Card
                  key={asset.id}
                  onClick={() => onSelectAsset(asset)}
                  className={`p-4 border-border bg-card hover:border-foreground/20 transition-colors cursor-pointer flex flex-col justify-between group relative overflow-hidden ${selectedAssetIds.includes(asset.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Category icon, Tag, Status Badge */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={(e) => toggleSelectAsset(e, asset.id)}
                          className="text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                          title={selectedAssetIds.includes(asset.id) ? 'Deselect asset' : 'Select asset for batch action'}
                        >
                          {selectedAssetIds.includes(asset.id) ? (
                            <CheckSquare className="size-4 text-primary" />
                          ) : (
                            <Square className="size-4" />
                          )}
                        </button>
                        <div className="p-1.5 rounded-md bg-muted text-foreground">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5 font-mono">
                            <span className="text-xs font-bold text-foreground">
                              {asset.asset_tag}
                            </span>
                            <button
                              onClick={(e) => handleCopy(e, `tag-${asset.id}`, asset.asset_tag)}
                              className="text-muted-foreground hover:text-foreground p-0.5 rounded cursor-pointer"
                              title="Copy Asset Tag"
                            >
                              {isCopied ? <Check className="size-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="size-3" />}
                            </button>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground block">
                            SN: {asset.serial_number}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onOpenLabelModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLabelModal([asset]);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer"
                            title="Print QR & Barcode Label"
                          >
                            <QrCode className="size-3.5" />
                          </button>
                        )}
                        {getStatusBadge(asset.status)}
                      </div>
                    </div>

                    {/* Model Name */}
                    <div>
                      <h4 className="font-heading font-medium text-xs text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {asset.model}
                      </h4>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {asset.category} • {asset.location || 'Unspecified'}
                      </span>
                    </div>

                    {/* Assignee / Custody Details */}
                    <div className="p-2 rounded-md bg-muted/40 border border-border/80 text-xs font-mono">
                      <div className="flex items-center space-x-2">
                        <div className="size-5 rounded-full bg-muted text-foreground flex items-center justify-center font-bold text-[9px] uppercase shrink-0 border border-border">
                          {asset.assigned_to_name ? asset.assigned_to_name.charAt(0) : '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-foreground block truncate text-[11px]">
                            {asset.assigned_to_name || 'Unassigned / In Stock'}
                          </span>
                          <span className="text-[9px] text-muted-foreground block truncate">
                            {asset.assigned_to_email || asset.department || 'No email linked'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Meta info: Warranty & Linked Ticket */}
                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <div>{getWarrantyInfo(asset.warranty_expiry_date)}</div>

                      {asset.last_ticket_id && (
                        <Badge variant="outline" className="h-4 text-[9px] font-mono gap-1 text-primary">
                          <Ticket className="size-2.5" />
                          <span>{asset.last_ticket_id}</span>
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Card Footer Action */}
                  <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                    <span>Lifecycle detail</span>
                    <span className="text-foreground group-hover:translate-x-0.5 transition-transform flex items-center space-x-0.5 font-medium">
                      <span>Inspect</span>
                      <ChevronRight className="size-3" />
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: DENSE MODERN TABLE VIEW */}
      {viewMode === 'table' && (
        <Card className="border-border overflow-hidden p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="w-8 py-2 px-3 text-center">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Select / Deselect all"
                  >
                    {selectedAssetIds.length === filteredAssets.length && filteredAssets.length > 0 ? (
                      <CheckSquare className="size-3.5 text-primary" />
                    ) : (
                      <Square className="size-3.5" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Endpoint / Hardware</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Serial Number</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Status</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Custody (Assignee)</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Location</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Warranty</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3">Last ITSM Ticket</TableHead>
                <TableHead className="text-[10px] uppercase font-mono py-2 px-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssets.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-10 text-center text-muted-foreground font-mono text-xs">
                    No assets found matching the filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredAssets.map((asset) => (
                  <TableRow
                    key={asset.id}
                    className={`border-border hover:bg-muted/40 transition-colors cursor-pointer group ${selectedAssetIds.includes(asset.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => onSelectAsset(asset)}
                  >
                    <TableCell className="w-8 py-2 px-3 text-center" onClick={(e) => toggleSelectAsset(e, asset.id)}>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {selectedAssetIds.includes(asset.id) ? (
                          <CheckSquare className="size-3.5 text-primary" />
                        ) : (
                          <Square className="size-3.5" />
                        )}
                      </button>
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      <div className="flex items-center space-x-2">
                        <div className="p-1 rounded bg-muted text-muted-foreground">
                          {getCategoryIcon(asset.category)}
                        </div>
                        <div>
                          <div className="font-heading font-medium text-xs text-foreground group-hover:text-primary transition-colors">
                            {asset.model}
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {asset.asset_tag}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-2 px-3 font-mono text-[11px] text-muted-foreground">
                      {asset.serial_number}
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      {getStatusBadge(asset.status)}
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      {asset.assigned_to_name ? (
                        <div>
                          <div className="text-foreground font-medium text-xs font-mono">{asset.assigned_to_name}</div>
                          <div className="text-muted-foreground text-[10px] font-mono truncate max-w-[130px]">{asset.assigned_to_email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/60 italic text-xs font-mono">Unassigned</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3 text-muted-foreground font-mono text-[11px]">
                      {asset.location ? (
                        <div className="flex items-center space-x-1">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[120px]">{asset.location}</span>
                        </div>
                      ) : (
                        <span>—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      {getWarrantyInfo(asset.warranty_expiry_date)}
                    </TableCell>

                    <TableCell className="py-2 px-3">
                      {asset.last_ticket_id ? (
                        <div>
                          <Badge variant="outline" className="h-4 text-[9px] font-mono text-primary">
                            {asset.last_ticket_id}
                          </Badge>
                          <div className="text-muted-foreground text-[10px] font-mono truncate max-w-[120px] mt-0.5" title={asset.last_ticket_title || ''}>
                            {asset.last_ticket_title}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground font-mono">—</span>
                      )}
                    </TableCell>

                    <TableCell className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onOpenLabelModal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenLabelModal([asset]);
                            }}
                            className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded cursor-pointer"
                            title="Print QR / Barcode Label"
                          >
                            <QrCode className="size-3.5" />
                          </button>
                        )}
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectAsset(asset);
                          }}
                          className="font-mono"
                        >
                          Inspect
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
};

