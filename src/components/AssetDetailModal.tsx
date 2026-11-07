import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Trash2, 
  Ticket, 
  Calendar, 
  User, 
  Cpu, 
  Copy, 
  Check, 
  Layers,
  QrCode,
  Printer
} from 'lucide-react';
import { QRCodeSvg, BarcodeSvg } from './QRCodeSvg';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Asset } from '../types';

interface AssetDetailModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, updates: Partial<Asset>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'custody' | 'lifecycle' | 'itsm' | 'label'>('details');
  const [prevAssetId, setPrevAssetId] = useState<number | null>(asset?.id ?? null);
  const [formData, setFormData] = useState<Partial<Asset>>(() => asset ? {
    model: asset.model,
    category: asset.category,
    status: asset.status,
    assigned_to_name: asset.assigned_to_name || '',
    assigned_to_email: asset.assigned_to_email || '',
    department: asset.department || '',
    location: asset.location || '',
    purchase_date: asset.purchase_date || '',
    warranty_expiry_date: asset.warranty_expiry_date || '',
    eol_date: asset.eol_date || '',
    notes: asset.notes || ''
  } : {});

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (asset && asset.id !== prevAssetId) {
    setPrevAssetId(asset.id);
    setFormData({
      model: asset.model,
      category: asset.category,
      status: asset.status,
      assigned_to_name: asset.assigned_to_name || '',
      assigned_to_email: asset.assigned_to_email || '',
      department: asset.department || '',
      location: asset.location || '',
      purchase_date: asset.purchase_date || '',
      warranty_expiry_date: asset.warranty_expiry_date || '',
      eol_date: asset.eol_date || '',
      notes: asset.notes || ''
    });
  }

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

  if (!isOpen || !asset) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCopySerial = () => {
    navigator.clipboard.writeText(asset.serial_number);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1800);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(asset.id, formData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete asset ${asset.asset_tag}?`)) {
      setIsDeleting(true);
      try {
        await onDelete(asset.id);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-border bg-card cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <Cpu className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold font-mono tracking-tight">
                  {asset.asset_tag}
                </CardTitle>
                <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border">
                  <span>SN: {asset.serial_number}</span>
                  <button
                    type="button"
                    onClick={handleCopySerial}
                    className="text-muted-foreground hover:text-foreground cursor-pointer ml-1"
                    title="Copy serial"
                  >
                    {isCopied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
                  </button>
                </div>
              </div>
              <CardDescription className="text-xs mt-0.5 font-mono">
                {asset.model} • {asset.category}
              </CardDescription>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </CardHeader>

        {/* Modal Navigation Tabs */}
        <div className="flex gap-1 px-4 pt-2 border-b border-border bg-muted/20 text-xs font-mono">
          {[
            { id: 'details', label: 'Hardware Specs', icon: Layers },
            { id: 'custody', label: 'User & Custody', icon: User },
            { id: 'lifecycle', label: 'Warranty & Dates', icon: Calendar },
            { id: 'itsm', label: 'ITSM History', icon: Ticket, badge: asset.last_ticket_id ? 1 : 0 },
            { id: 'label', label: 'QR Label', icon: QrCode },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-md font-medium text-xs transition border-b-2 cursor-pointer ${
                  isActive
                    ? 'border-primary text-foreground bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className="size-1.5 rounded-full bg-primary ml-0.5" />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Form Body with Scroll */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
          {/* Linked Ticket Alert Banner */}
          {asset.last_ticket_id && (
            <div className="bg-muted/40 border border-border rounded-md p-3 flex items-start gap-2.5">
              <Ticket className="size-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="text-xs font-sans">
                <span className="font-semibold text-foreground font-mono">Linked ITSM Event: </span>
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border">
                  {asset.last_ticket_id}
                </span>
                <p className="text-muted-foreground mt-0.5">{asset.last_ticket_title}</p>
              </div>
            </div>
          )}

          {/* TAB 1: HARDWARE SPECS */}
          {activeTab === 'details' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Asset Status</Label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                  >
                    <option value="in_use">In Use (Deployed)</option>
                    <option value="available">Available (In Stock)</option>
                    <option value="in_repair">In Repair</option>
                    <option value="pending_return">Pending Return (Offboarding)</option>
                    <option value="retired">Retired (Decommissioned)</option>
                    <option value="lost_stolen">Lost / Stolen</option>
                    <option value="pending_disposal">Pending Disposal / E-Waste</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Category</Label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                  >
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Mobile">Mobile Phone</option>
                    <option value="Server">Server / Infrastructure</option>
                    <option value="Other">Other Equipment</option>
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Hardware Model Name</Label>
                  <Input
                    type="text"
                    name="model"
                    value={formData.model || ''}
                    onChange={handleChange}
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Physical Location</Label>
                  <Input
                    type="text"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleChange}
                    placeholder="e.g. HQ - Floor 3, IT Closet Shelf B"
                    className="h-8 text-xs font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER & CUSTODY */}
          {activeTab === 'custody' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Assigned Employee</Label>
                  <Input
                    type="text"
                    name="assigned_to_name"
                    value={formData.assigned_to_name || ''}
                    onChange={handleChange}
                    placeholder="e.g. Sarah Connor"
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Employee Email Address</Label>
                  <Input
                    type="email"
                    name="assigned_to_email"
                    value={formData.assigned_to_email || ''}
                    onChange={handleChange}
                    placeholder="e.g. sarah.connor@acme.com"
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input
                    type="text"
                    name="department"
                    value={formData.department || ''}
                    onChange={handleChange}
                    placeholder="e.g. Engineering, Sales, Human Resources"
                    className="h-8 text-xs font-sans"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">Custody Notes & Transfer History</Label>
                  <textarea
                    name="notes"
                    rows={3}
                    value={formData.notes || ''}
                    onChange={handleChange}
                    placeholder="Custody changes, offboarding return tracking, or equipment condition notes..."
                    className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WARRANTY & LIFECYCLE */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                  <Input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date || ''}
                    onChange={handleChange}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Warranty Expiry Date</Label>
                  <Input
                    type="date"
                    name="warranty_expiry_date"
                    value={formData.warranty_expiry_date || ''}
                    onChange={handleChange}
                    className="h-8 text-xs font-mono"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">End of Life (EOL) Expected Date</Label>
                  <Input
                    type="date"
                    name="eol_date"
                    value={formData.eol_date || ''}
                    onChange={handleChange}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ITSM SYNC HISTORY */}
          {activeTab === 'itsm' && (
            <div className="space-y-3 font-sans">
              {asset.last_ticket_id ? (
                <div className="p-3.5 rounded-md bg-muted/40 border border-border space-y-2">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-foreground">Latest Ticket Cross-Reference</span>
                    <Badge variant="outline" className="text-xs h-5">
                      {asset.last_ticket_id}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{asset.last_ticket_title || 'No title recorded'}</p>
                  <span className="text-[10px] text-muted-foreground font-mono block">
                    Last updated: {asset.updated_at ? asset.updated_at.substring(0, 19).replace('T', ' ') : 'N/A'}
                  </span>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No previous ticketing events linked to this asset.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: QR & BARCODE ASSET LABEL */}
          {activeTab === 'label' && (
            <div className="space-y-4 font-mono">
              <div className="p-4 bg-muted/30 border border-border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-4 shadow-sm flex items-center justify-between gap-4 w-full sm:max-w-md">
                  <div className="flex-1">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      PROPERTY OF ACME CORP
                    </div>
                    <div className="font-extrabold text-base tracking-tight text-slate-950 font-mono">
                      {asset.asset_tag}
                    </div>
                    <div className="text-xs font-semibold text-slate-800 truncate mt-0.5">
                      {asset.model}
                    </div>
                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                      S/N: <strong>{asset.serial_number}</strong>
                    </div>
                    <div className="mt-2 text-[9px] text-slate-500 pt-1 border-t border-slate-200">
                      Custody: {asset.assigned_to_name || 'UNASSIGNED STOCK'}
                    </div>
                  </div>
                  <div className="p-1 bg-white border border-slate-200 rounded shrink-0 flex flex-col items-center">
                    <QRCodeSvg
                      value={`seamit://asset/${asset.asset_tag}?sn=${asset.serial_number}`}
                      size={72}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                    <span className="text-[7px] text-slate-500 mt-0.5 uppercase font-bold">SCAN ITAM</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => window.print()}
                    className="gap-1.5 h-8 text-xs font-mono"
                  >
                    <Printer className="size-3.5" />
                    <span>Print Label</span>
                  </Button>
                  <span className="text-[10px] text-muted-foreground text-center">
                    Ready for thermal sticker printer
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <CardFooter className="p-0 pt-4 border-t border-border flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={handleDelete}
              disabled={isDeleting}
              className="gap-1.5 h-7 text-xs font-mono text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Asset'}</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={onClose}
                className="h-7 text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="xs"
                disabled={isSaving}
                className="gap-1.5 h-7 text-xs font-mono"
              >
                <Save className="size-3" />
                <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
