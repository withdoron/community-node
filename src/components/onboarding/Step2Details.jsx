import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, ChevronDown } from "lucide-react";
import { base44 } from '@/api/base44Client';

export default function Step2Details({ formData, setFormData, uploading, setUploading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const dropdownRef = useRef(null);

  // Fetch all category groups (ADR-001: client-side filter — Base44 filter unreliable)
  const { data: categoryGroups = [] } = useQuery({
    queryKey: ['categoryGroups'],
    queryFn: () => base44.entities.CategoryGroup.list(),
  });

  const { data: allSubCategories = [] } = useQuery({
    queryKey: ['subCategories'],
    queryFn: async () => await base44.entities.SubCategory.list()
  });

  // Filter to current archetype and transform to UI structure
  const currentArchetypeCategories = useMemo(() => {
    const filtered = (categoryGroups || []).filter(
      cat => cat.archetype_id === formData.archetype_id
    );
    return filtered.map(group => ({
      label: group.label,
      subCategories: allSubCategories
        .filter(sub => sub.group_id === group.id)
        .map(sub => ({
          name: sub.name,
          keywords: sub.keywords || [],
          id: sub.id
        }))
    }));
  }, [categoryGroups, allSubCategories, formData.archetype_id]);

  // Dynamic placeholder from ACTUAL data
  const getDynamicPlaceholder = () => {
    // Flatten all subcategories into one list
    const allSubs = currentArchetypeCategories
      .flatMap(cat => cat.subCategories || [])
      .map(sub => typeof sub === 'string' ? sub : sub.name);
    
    // Take the first 3 as examples
    const examples = allSubs.slice(0, 3).join(', ');
    
    return examples ? `e.g. ${examples}...` : 'Search categories...';
  };

  // Toggle accordion category
  const toggleCategory = (key) => {
    setExpandedCategory(expandedCategory === key ? null : key);
  };

  // Smart Filter Logic with keyword matching
  const filteredCategories = useMemo(() => {
    if (!searchTerm) return currentArchetypeCategories;

    const term = searchTerm.toLowerCase();
    return currentArchetypeCategories
      .map(category => {
        const labelMatch = category.label.toLowerCase().includes(term);
        const matchingSubs = category.subCategories.filter(sub => {
          const name = typeof sub === 'string' ? sub : sub.name;
          const keywords = typeof sub === 'string' ? [] : sub.keywords || [];
          
          // Match on name or any keyword
          return name.toLowerCase().includes(term) || 
                 keywords.some(keyword => keyword.toLowerCase().includes(term));
        });

        if (labelMatch) {
          return { ...category };
        } else if (matchingSubs.length > 0) {
          return { ...category, subCategories: matchingSubs };
        }
        return null;
      })
      .filter(Boolean);
  }, [searchTerm, currentArchetypeCategories]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setIsEditing(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCategorySearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsEditing(true);
    setIsDropdownOpen(true);
  };



  const formatPhoneNumber = (value) => {
    const phoneNumber = value.replace(/[^\d]/g, '');
    const phoneNumberLength = phoneNumber.length;
    if (phoneNumberLength < 4) return phoneNumber;
    if (phoneNumberLength < 7) {
      return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
    }
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6, 10)}`;
  };

  const handlePhotoUpload = async (files) => {
    if (files.length === 0) return;

    setUploading(true);
    const uploadedUrls = [];

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setFormData({ ...formData, photos: [...formData.photos, ...uploadedUrls] });
    setUploading(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    await handlePhotoUpload(files);
  };

  const removePhoto = (index) => {
    setFormData({ 
      ...formData, 
      photos: formData.photos.filter((_, i) => i !== index) 
    });
  };

  return (
    <div className="space-y-6">
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #0f172a inset !important;
          -webkit-text-fill-color: white !important;
          transition: background-color 5000s ease-in-out 0s;
        }
      `}</style>
      <div>
        <h2 className="text-2xl font-bold text-slate-100">Tell us about your organization</h2>
        <p className="text-slate-400 mt-1">Professional information customers will see</p>
      </div>

      <div className="grid gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-slate-200">Organization Name <span className="text-amber-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Your organization name"
              className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder-slate-500"
            />
          </div>

          <div className="relative" ref={dropdownRef}>
            <Label htmlFor="category_search" className="text-slate-200">
              Category
            </Label>
            <div className="relative">
              <Input
                id="category_search"
                type="text"
                value={
                  isEditing || isDropdownOpen
                    ? searchTerm
                    : formData.primary_category && formData.sub_category
                    ? `${formData.primary_category} → ${formData.sub_category}`
                    : searchTerm
                }
                onChange={handleCategorySearchChange}
                onFocus={() => {
                  setSearchTerm('');
                  setIsEditing(true);
                  setIsDropdownOpen(true);
                }}
                placeholder={getDynamicPlaceholder()}
                autoComplete="off"
                data-lpignore="true"
                name="category_search_custom"
                className={`mt-1.5 pr-10 ${
                  formData.primary_category && formData.sub_category && !isDropdownOpen
                    ? 'bg-slate-800/50 border-indigo-500/50 text-emerald-400 font-bold'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 placeholder-slate-500'
                }`}
              />
              {formData.primary_category && formData.sub_category && !isDropdownOpen && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, primary_category: '', sub_category: '' });
                    setSearchTerm('');
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">Choose your primary category now. You can add more categories later in your dashboard.</p>
            
            {isDropdownOpen && (
              <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
                {!searchTerm ? (
                  /* Browse Mode - Accordion Style */
                  currentArchetypeCategories.length > 0 ? (
                    <div>
                      {currentArchetypeCategories.map((cat) => (
                        <div key={cat.label}>
                          <button
                            type="button"
                            onClick={() => toggleCategory(cat.label)}
                            className="w-full flex justify-between items-center p-3 hover:bg-slate-800 cursor-pointer transition-colors border-b border-slate-800"
                          >
                            <span className="text-sm font-semibold text-slate-200">{cat.label}</span>
                            <ChevronDown 
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                expandedCategory === cat.label ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {expandedCategory === cat.label && (
                            <div className="bg-slate-800/30">
                              {cat.subCategories.map((sub) => {
                                const subName = typeof sub === 'string' ? sub : sub.name;
                                return (
                                  <button
                                    key={subName}
                                    type="button"
                                    onClick={() => {
                                      const subObj = typeof sub === 'object' ? sub : null;
                                      setFormData({ 
                                        ...formData, 
                                        primary_category: cat.label, 
                                        sub_category: subName,
                                        sub_category_id: subObj?.id || ''
                                      });
                                      setSearchTerm('');
                                      setIsEditing(false);
                                      setIsDropdownOpen(false);
                                      setExpandedCategory(null);
                                    }}
                                    className="w-full text-left px-6 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                                  >
                                    {subName}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : null )
                ) : (
                  /* Search Mode - Flat List */
                  filteredCategories.length > 0 ? (
                    filteredCategories.map((cat) => (
                      <div key={cat.label} className="py-2">
                        <div className="px-3 py-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          {cat.label}
                        </div>
                        {cat.subCategories.map((sub) => {
                          const subName = typeof sub === 'string' ? sub : sub.name;
                          return (
                            <button
                              key={subName}
                              type="button"
                              onClick={() => {
                                const subObj = typeof sub === 'object' ? sub : null;
                                setFormData({ 
                                  ...formData, 
                                  primary_category: cat.label, 
                                  sub_category: subName,
                                  sub_category_id: subObj?.id || ''
                                });
                                setSearchTerm('');
                                setIsEditing(false);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-emerald-400 transition-colors"
                            >
                              {subName}
                            </button>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-4 text-sm text-slate-500 text-center">
                      No categories found
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="description" className="text-slate-200">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell customers about your organization..."
              className="mt-1.5 min-h-[100px] bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
        </div>

        {/* Location Section */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
          <h3 className="text-lg font-semibold text-white">Location</h3>

          {/* Non-venue archetypes: show toggle */}
          {formData.archetype !== 'location' && formData.archetype !== 'venue' && (
            <label className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg cursor-pointer">
              <Switch
                checked={formData.display_full_address}
                onCheckedChange={(checked) => setFormData({ ...formData, display_full_address: checked })}
                className="data-[state=checked]:bg-amber-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-200">Display full address on map?</p>
                <p className="text-xs text-slate-500">Off by default to protect privacy</p>
              </div>
            </label>
          )}

          {/* Street Address - show if venue OR if toggle is on */}
          {(formData.archetype === 'location' || formData.archetype === 'venue' || formData.display_full_address) && (
            <div>
              <Label htmlFor="address" className="text-slate-200">
                Street Address <span className="text-amber-500">*</span>
              </Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main Street"
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city" className="text-slate-200">City <span className="text-amber-500">*</span></Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Eugene"
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            {(formData.archetype === 'location' || formData.archetype === 'venue' || formData.display_full_address) && (
              <div>
                <Label htmlFor="state" className="text-slate-200">State <span className="text-amber-500">*</span></Label>
                <Select
                  value={formData.state}
                  onValueChange={(value) => setFormData({ ...formData, state: value })}
                >
                  <SelectTrigger className="mt-1.5 bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OR">Oregon</SelectItem>
                    <SelectItem value="WA">Washington</SelectItem>
                    <SelectItem value="CA">California</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label htmlFor="zip_code" className="text-slate-200">Zip Code <span className="text-amber-500">*</span></Label>
              <Input
                id="zip_code"
                type="tel"
                value={formData.zip_code || ''}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="97401"
                maxLength={10}
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {formData.archetype === 'service' && (
            <div>
              <Label htmlFor="service_area" className="text-slate-200">Service Radius</Label>
              <Input
                id="service_area"
                value={formData.service_area}
                onChange={(e) => setFormData({ ...formData, service_area: e.target.value })}
                placeholder="e.g., 25 mile radius"
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
          )}
        </div>

        {/* Contact Info Section */}
        <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-4">
          <h3 className="text-lg font-semibold text-white">Contact Information</h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone" className="text-slate-200">Phone <span className="text-amber-500">*</span></Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                placeholder="(555) 123-4567"
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-slate-200">Email <span className="text-amber-500">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contact@organization.com"
                className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">This will be visible to customers</p>
            </div>
          </div>

          <div>
            <Label htmlFor="website" className="text-slate-200">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://yourwebsite.com"
              className="mt-1.5 bg-slate-900 border-slate-700 text-white placeholder-slate-500"
            />
          </div>
        </div>

        {/* Brand/Profile Image */}
        <div>
          <Label className="text-slate-200">Brand/Profile Image</Label>
          <p className="text-xs text-slate-500 mt-1 mb-2">Drag & drop or click to upload</p>
          <div 
            className={`p-4 rounded-lg border-2 border-dashed transition-all ${
              isDragging 
                ? 'border-amber-500 bg-amber-500/10' 
                : 'border-slate-700 bg-slate-800/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="flex flex-wrap gap-3">
              {formData.photos.map((photo, idx) => (
                <div key={idx} className="relative group">
                  <img
                    src={photo}
                    alt={`Upload ${idx + 1}`}
                    className="h-24 w-24 rounded-lg object-cover border-2 border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="h-24 w-24 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer hover:border-amber-500 hover:bg-amber-500/10 transition-all">
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                ) : (
                  <Upload className="h-5 w-5 text-slate-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handlePhotoUpload(Array.from(e.target.files))}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}