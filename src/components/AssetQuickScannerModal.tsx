import React, { useState, useEffect, useRef } from 'react';
import { Scan, Search, X, CheckCircle2, ArrowRight, Laptop, MapPin, User, ShieldAlert, Sparkles } from 'lucide-react';
import type { Asset } from '../types';

interface Props {
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
  onSelectAsset: (asset: Asset) => void;
  onQuickUpdateStatus: (assetId: number, status: Asset['status'], location?: string) => Promise<void>;
}

export const AssetQuickScannerModal: React.FC<Props> = ({
  assets,
  isOpen,
  onClose,
  onSelectAsset,
  onQuickUpdateStatus
}) => {
  const [scanInput, setScanInput] = useState('');
  const [matchedAsset, setMatchedAsset] = useState<Asset | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setScanInput('');
      setMatchedAsset(null);
      setActionNotice(null);
      setTimeout(() => inputRef.current?.focus(), 100);
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

  const handleSearch = (raw: string) => {
    setScanInput(raw);
    const clean = raw.trim().toUpperCase();
    if (!clean) {
      setMatchedAsset(null);
      return;
    }

    // Try matching asset_tag, serial_number, or seamit:// URI
    const found = assets.find((a) => {
      if (a.asset_tag.toUpperCase() === clean) return true;
      if (a.serial_number.toUpperCase() === clean) return true;
      if (clean.includes(a.asset_tag.toUpperCase())) return true;
      if (clean.includes(a.serial_number.toUpperCase())) return true;
      return false;
    });

    setMatchedAsset(found || null);
  };

  const handleExecuteStatus = async (status: Asset['status'], location?: string) => {
    if (!matchedAsset) return;
    setIsUpdating(true);
    try {
      await onQuickUpdateStatus(matchedAsset.id, status, location);
      setActionNotice(`Status updated to '${status}' successfully.`);
      setTimeout(() => setActionNotice(null), 3000);
    } catch (err: any) {
      setActionNotice(`Error: ${err.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Scan className="size-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Physical Asset Quick Scanner</h2>
              <p className="text-xs text-muted-foreground font-mono">
                Laser barcode gun, QR camera scanner, or manual tag entry
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Scanner Input Bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={scanInput}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Scan barcode or type Asset Tag (e.g. ASSET-1001 or Serial)..."
              className="w-full bg-muted/60 border-2 border-primary/40 focus:border-primary rounded-lg pl-10 pr-4 py-2.5 font-mono text-sm text-foreground focus:outline-none placeholder:text-muted-foreground transition-all"
            />
            <Search className="size-4 absolute left-3.5 top-3.5 text-muted-foreground" />
            {scanInput && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground font-mono"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Action Notice */}
        {actionNotice && (
          <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Matched Asset Card */}
        {matchedAsset ? (
          <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                  <Laptop className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base text-foreground">{matchedAsset.asset_tag}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono uppercase bg-primary/10 text-primary font-semibold">
                      {matchedAsset.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">
                    {matchedAsset.model} • S/N: {matchedAsset.serial_number}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60 text-xs font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5 truncate">
                <User className="size-3.5 text-slate-400" />
                <span className="truncate">{matchedAsset.assigned_to_name || 'Unassigned'}</span>
              </div>
              <div className="flex items-center gap-1.5 truncate">
                <MapPin className="size-3.5 text-slate-400" />
                <span className="truncate">{matchedAsset.location || 'Unknown Location'}</span>
              </div>
            </div>

            {/* Quick Transition Buttons */}
            <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleExecuteStatus('available', 'IT Storage Closet - Shelf B')}
                className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-md text-xs font-mono font-medium transition-colors"
              >
                ✓ Check-In (Available)
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleExecuteStatus('in_repair', 'IT Repair Depot')}
                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-md text-xs font-mono font-medium transition-colors"
              >
                🛠 Send to Repair
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleExecuteStatus('pending_return', 'IT Return Quarantine')}
                className="px-2.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30 rounded-md text-xs font-mono font-medium transition-colors"
              >
                📦 Pending Return
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectAsset(matchedAsset);
                  onClose();
                }}
                className="px-2.5 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md text-xs font-mono font-medium transition-colors ml-auto flex items-center gap-1"
              >
                <span>Full Details</span>
                <ArrowRight className="size-3" />
              </button>
            </div>
          </div>
        ) : scanInput.trim() ? (
          <div className="mt-4 p-6 text-center border border-dashed border-border rounded-lg">
            <ShieldAlert className="size-8 mx-auto text-amber-500/60 mb-2" />
            <div className="text-xs font-bold text-foreground font-mono">No matching asset found</div>
            <p className="text-[11px] text-muted-foreground font-mono mt-1">
              Could not match "{scanInput}" to any Tag or Serial in inventory.
            </p>
          </div>
        ) : (
          <div className="mt-4 p-5 bg-muted/20 border border-border/60 rounded-lg text-xs font-mono text-muted-foreground flex items-center gap-3">
            <Sparkles className="size-4 text-primary shrink-0" />
            <span>Ready for scan. Point laser scanner at asset barcode or type any tag/serial to begin.</span>
          </div>
        )}
      </div>
    </div>
  );
};
