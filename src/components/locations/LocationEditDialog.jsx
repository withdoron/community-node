import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function LocationEditDialog({ 
  location, 
  open, 
  onClose, 
  onSave,
  isSaving 
}) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    is_auto_boost_enabled: false
  });

  useEffect(() => {
    if (location) {
      setFormData({
        name: location.name || '',
        address: location.address || '',
        city: location.city || '',
        phone: location.phone || '',
        email: location.email || '',
        is_auto_boost_enabled: location.is_auto_boost_enabled || false
      });
    } else {
      setFormData({
        name: '',
        address: '',
        city: '',
        phone: '',
        email: '',
        is_auto_boost_enabled: false
      });
    }
  }, [location, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  const isNew = !location?.id;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? 'Add New Location' : 'Edit Location'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Location Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Downtown, Main Office"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="City"
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Email"
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <div>
              <Label htmlFor="auto-boost" className="font-medium text-slate-900">Smart Auto-Boost</Label>
              <p className="text-sm text-slate-600">Automatically boost when under-exposed during active hours</p>
            </div>
            <Switch
              id="auto-boost"
              checked={formData.is_auto_boost_enabled}
              onCheckedChange={(checked) => setFormData({ ...formData, is_auto_boost_enabled: checked })}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => onClose(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-slate-900 hover:bg-slate-800"
              disabled={!formData.city || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isNew ? (
                'Add Location'
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}