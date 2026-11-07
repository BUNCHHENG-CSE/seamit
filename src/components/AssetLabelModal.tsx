import React, { useState, useEffect } from 'react';
import { X, Printer, QrCode, Tag, Sparkles } from 'lucide-react';
import { QRCodeSvg, BarcodeSvg } from './QRCodeSvg';
import type { Asset } from '../types';

interface Props {
  assets: Asset[];
  isOpen: boolean;
  onClose: () => void;
}

export const AssetLabelModal: React.FC<Props> = ({ assets, isOpen, onClose }) => {
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

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

  if (!isOpen || assets.length === 0) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm overflow-y-auto cursor-pointer"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl p-6 overflow-hidden my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <QrCode className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Print Asset Tag & QR Labels ({assets.length} device{assets.length > 1 ? 's' : ''})
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Thermal barcode printer or standard Avery 5160 / letter sheets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted rounded-lg p-0.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setLabelSize('standard')}
                className={`px-3 py-1 rounded-md transition-colors ${labelSize === 'standard' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Standard (2" x 1")
              </button>
              <button
                type="button"
                onClick={() => setLabelSize('compact')}
                className={`px-3 py-1 rounded-md transition-colors ${labelSize === 'compact' ? 'bg-card text-foreground shadow-sm font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Compact (1.5" x 0.75")
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg font-mono text-xs font-bold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Printer className="size-3.5" />
              <span>Print Sheet</span>
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

        {/* Printable Labels Canvas */}
        <div className="mt-5 max-h-[65vh] overflow-y-auto p-4 bg-muted/40 rounded-lg border border-border/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4 print:grid-cols-2 print:gap-2">
            {assets.map((asset) => {
              const qrPayload = `seamit://asset/${asset.asset_tag}?sn=${asset.serial_number}`;
              return (
                <div
                  key={asset.id}
                  className="bg-white text-slate-900 border-2 border-slate-900 rounded-md p-3.5 shadow-sm flex items-center justify-between gap-3 relative select-none print:shadow-none print:break-inside-avoid"
                  style={{ minHeight: labelSize === 'standard' ? '120px' : '95px' }}
                >
                  {/* Left Label Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 tracking-wider uppercase border-b border-slate-200 pb-1 mb-1.5">
                        <span className="flex items-center gap-1">
                          <Tag className="size-2.5" />
                          <span>IT ASSET PROPERTY</span>
                        </span>
                        <span className="font-mono text-[9px] text-slate-500">ACME CORP</span>
                      </div>

                      <div className="font-mono font-extrabold text-base tracking-tight text-slate-950">
                        {asset.asset_tag}
                      </div>

                      <div className="text-[11px] font-semibold text-slate-800 truncate mt-0.5">
                        {asset.model}
                      </div>

                      <div className="font-mono text-[10px] text-slate-600 truncate mt-0.5">
                        S/N: <span className="font-bold">{asset.serial_number}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500 font-mono">
                      <span>{asset.assigned_to_name || 'UNASSIGNED STOCK'}</span>
                      <span className="uppercase font-semibold">{asset.category}</span>
                    </div>
                  </div>

                  {/* Right QR Code */}
                  <div className="flex flex-col items-center justify-center p-1 bg-white border border-slate-200 rounded shrink-0">
                    <QRCodeSvg
                      value={qrPayload}
                      size={labelSize === 'standard' ? 76 : 60}
                      fgColor="#0f172a"
                      bgColor="#ffffff"
                    />
                    <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase font-bold tracking-tighter">
                      SCAN FOR ITAM
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-mono">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-primary" />
            <span>Labels compatible with standard laser/inkjet printers & Zebra thermal label printers.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
