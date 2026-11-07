import React, { useState, useEffect } from 'react';
import { X, Cpu, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import type { Asset } from '../types';

interface CreateAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (asset: Partial<Asset>) => Promise<void>;
}

export const CreateAssetModal: React.FC<CreateAssetModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [formData, setFormData] = useState<Partial<Asset>>({
    asset_tag: '',
    serial_number: '',
    model: '',
    category: 'Laptop',
    status: 'available',
    assigned_to_name: '',
    assigned_to_email: '',
    department: '',
    location: 'IT Storage Closet',
    purchase_date: '',
    warranty_expiry_date: '',
    eol_date: '',
    notes: ''
  });

  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        asset_tag: prev.asset_tag || `ASSET-${Math.floor(Math.random() * 9000) + 1000}`,
        purchase_date: prev.purchase_date || new Date().toISOString().substring(0, 10),
      }));
    }
  }, [isOpen]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.asset_tag || !formData.serial_number || !formData.model) {
      setError('Asset tag, serial number, and hardware model are required.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onCreate(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border-border bg-card cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="p-4 sm:p-5 border-b border-border flex flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20 text-primary">
              <Cpu className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Add New IT Asset</CardTitle>
              <CardDescription className="text-xs">Register hardware endpoint into active inventory.</CardDescription>
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

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-xs flex items-center gap-2 font-mono">
            <AlertCircle className="size-3.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <CardContent className="p-5 space-y-3.5 text-xs font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Asset Tag *</Label>
                <Input
                  type="text"
                  required
                  name="asset_tag"
                  value={formData.asset_tag || ''}
                  onChange={handleChange}
                  placeholder="e.g. ASSET-1049"
                  className="h-8 text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hardware Serial Number *</Label>
                <Input
                  type="text"
                  required
                  name="serial_number"
                  value={formData.serial_number || ''}
                  onChange={handleChange}
                  placeholder="e.g. C02G1234MD6R"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hardware Model *</Label>
                <Input
                  type="text"
                  required
                  name="model"
                  value={formData.model || ''}
                  onChange={handleChange}
                  placeholder="e.g. MacBook Pro 14 M3, Dell 5540"
                  className="h-8 text-xs font-sans"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <select
                  name="category"
                  value={formData.category || 'Laptop'}
                  onChange={handleChange}
                  className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                >
                  <option value="Laptop">Laptop</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Mobile">Mobile Phone</option>
                  <option value="Server">Server / Infrastructure</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Initial Status</Label>
                <select
                  name="status"
                  value={formData.status || 'available'}
                  onChange={handleChange}
                  className="w-full bg-input/20 border border-input rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-ring font-mono"
                >
                  <option value="available">Available (In Stock)</option>
                  <option value="in_use">In Use (Deployed)</option>
                  <option value="in_repair">In Repair</option>
                  <option value="pending_return">Pending Return</option>
                  <option value="retired">Retired</option>
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Storage Location</Label>
                <Input
                  type="text"
                  name="location"
                  value={formData.location || ''}
                  onChange={handleChange}
                  placeholder="e.g. IT Storage Shelf B"
                  className="h-8 text-xs font-sans"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Assigned User (Optional)</Label>
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
                <Label className="text-xs text-muted-foreground">User Email</Label>
                <Input
                  type="email"
                  name="assigned_to_email"
                  value={formData.assigned_to_email || ''}
                  onChange={handleChange}
                  placeholder="e.g. sarah.connor@acme.com"
                  className="h-8 text-xs font-sans"
                />
              </div>
            </div>

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
            </div>
          </CardContent>

          <CardFooter className="p-4 border-t border-border flex items-center justify-end gap-2">
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
              disabled={isSubmitting}
              className="gap-1.5 h-7 text-xs font-mono"
            >
              <Plus className="size-3" />
              <span>{isSubmitting ? 'Creating...' : 'Create Asset'}</span>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};
