import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Copy,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Shuffle,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  getNestedValue,
  setNestedValue,
  applyClientRecordToConfig,
} from '../../lib/reactTemplateManifest.ts';
import { calculateContrastRatio } from '../../lib/templateEngine.ts';
import {
  Client,
  WebsiteProject,
  ReactTemplateManifest,
  ManifestField,
  ManifestListField,
} from '../../types/index.ts';

export interface ReactSchemaFormProps {
  manifest: ReactTemplateManifest;
  config: Record<string, any>;
  onChange: (newConfig: Record<string, any>) => void;
  client?: Client | null;
  onClientSelect?: (clientId: string) => void;
  allClients?: Client[];
  clients?: Client[];
  projectTitle?: string;
  onProjectTitleChange?: (title: string) => void;
  otherProjects?: WebsiteProject[];
  projects?: WebsiteProject[];
  currentProjectId?: string;
  currentTemplateId?: string;
}

export const ReactSchemaForm: React.FC<ReactSchemaFormProps> = ({
  manifest,
  config,
  onChange,
  client,
  clients = [],
  projects = [],
  currentProjectId,
}) => {
  const [activeGroup, setActiveGroup] = useState<string>('all');
  const [copiedFromClient, setCopiedFromClient] = useState(false);
  const [lockedBrand, setLockedBrand] = useState(false);
  const [lockedSections, setLockedSections] = useState(false);

  // Group fields by prefix or manifest group attribute
  const groupedFields = useMemo(() => {
    const groups: Record<string, ManifestField[]> = {
      details: [],
      assets: [],
      brand: [],
      layout: [],
      other: [],
    };

    manifest.fields.forEach((field: ManifestField) => {
      let groupKey = field.group?.toLowerCase();
      if (!groupKey) {
        if (field.key.startsWith('details.')) groupKey = 'details';
        else if (field.key.startsWith('assets.')) groupKey = 'assets';
        else if (field.key.startsWith('brand.')) groupKey = 'brand';
        else if (field.key.startsWith('layout.')) groupKey = 'layout';
        else groupKey = 'other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(field);
    });

    return groups;
  }, [manifest.fields]);

  // Handle single field change
  const handleFieldChange = (key: string, value: any) => {
    const updated = setNestedValue(config, key, value);
    onChange(updated);
  };

  // Handle image upload and resize to max 1600px
  const handleImageUpload = (
    key: string,
    file: File,
    maxSizeBytes = 2 * 1024 * 1024
  ) => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid PNG, JPG, or WebP image file.');
      return;
    }

    if (file.size > maxSizeBytes * 2) {
      alert(`File is too large. Maximum raw file size is ${(maxSizeBytes * 2 / (1024 * 1024)).toFixed(1)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const resizedDataUrl = canvas.toDataURL(mime, 0.88);
          handleFieldChange(key, resizedDataUrl);
        } else {
          handleFieldChange(key, dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Copy values from client record
  const handleCopyFromClient = () => {
    if (!client) return;
    const updated = applyClientRecordToConfig(config, client);
    onChange(updated);
    setCopiedFromClient(true);
    setTimeout(() => setCopiedFromClient(false), 2000);
  };

  // Shuffle action on layout & brand values
  const handleShuffle = () => {
    let updated = { ...config };

    if (!lockedBrand) {
      const palettes = [
        { primary: '#D92D50', secondary: '#101828' },
        { primary: '#0E7090', secondary: '#0F172A' },
        { primary: '#15803D', secondary: '#1C1917' },
        { primary: '#6366F1', secondary: '#09090B' },
        { primary: '#B45309', secondary: '#18181B' },
        { primary: '#2563EB', secondary: '#0F172A' },
      ];
      const pick = palettes[Math.floor(Math.random() * palettes.length)];
      updated = setNestedValue(updated, 'brand.primaryColor', pick.primary);
      updated = setNestedValue(updated, 'brand.secondaryColor', pick.secondary);
    }

    if (!lockedSections && manifest.variants) {
      manifest.variants.forEach((v: any) => {
        if (v.options.length > 0) {
          const opt = v.options[Math.floor(Math.random() * v.options.length)];
          updated = setNestedValue(updated, `layout.${v.group}`, opt);
        }
      });
    }

    onChange(updated);
  };

  // List management helpers
  const handleAddListItem = (listKey: string, itemFields: ManifestField[], maxItems = 10) => {
    const currentList = (getNestedValue(config, listKey) || []) as any[];
    if (currentList.length >= maxItems) return;

    const newItem: Record<string, any> = {};
    itemFields.forEach((f) => {
      const subKey = f.key.split('.').pop() || f.key;
      newItem[subKey] = f.defaultValue !== undefined ? f.defaultValue : '';
    });

    const updatedList = [...currentList, newItem];
    const updated = setNestedValue(config, listKey, updatedList);
    onChange(updated);
  };

  const handleRemoveListItem = (listKey: string, index: number, minItems = 0) => {
    const currentList = (getNestedValue(config, listKey) || []) as any[];
    if (currentList.length <= minItems) return;

    const updatedList = currentList.filter((_, i) => i !== index);
    const updated = setNestedValue(config, listKey, updatedList);
    onChange(updated);
  };

  const handleMoveListItem = (listKey: string, index: number, direction: 'up' | 'down') => {
    const currentList = [...((getNestedValue(config, listKey) || []) as any[])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= currentList.length) return;

    const temp = currentList[index];
    currentList[index] = currentList[targetIdx];
    currentList[targetIdx] = temp;

    const updated = setNestedValue(config, listKey, currentList);
    onChange(updated);
  };

  const handleListFieldChange = (listKey: string, itemIndex: number, fieldKey: string, val: any) => {
    const currentList = [...((getNestedValue(config, listKey) || []) as any[])];
    if (!currentList[itemIndex]) currentList[itemIndex] = {};
    const subKey = fieldKey.split('.').pop() || fieldKey;
    currentList[itemIndex] = { ...currentList[itemIndex], [subKey]: val };

    const updated = setNestedValue(config, listKey, currentList);
    onChange(updated);
  };

  // Render a field input
  const renderFieldInput = (field: ManifestField, value: any, onChangeVal: (val: any) => void) => {
    const val = value !== undefined ? value : field.defaultValue !== undefined ? field.defaultValue : '';

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            value={val}
            onChange={(e) => onChangeVal(e.target.value)}
            rows={3}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className="w-full px-3 py-2 bg-white rounded-xl border border-black/15 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={val}
            onChange={(e) => onChangeVal(parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-white rounded-xl border border-black/15 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={!!val}
              onChange={(e) => onChangeVal(e.target.checked)}
              className="w-4 h-4 rounded text-[#D92D50] focus:ring-[#D92D50]"
            />
            <span className="text-xs text-[#4B5563]">Enabled</span>
          </label>
        );

      case 'select':
        return (
          <select
            value={val}
            onChange={(e) => onChangeVal(e.target.value)}
            className="w-full px-3 py-2 bg-white rounded-xl border border-black/15 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
          >
            {field.options?.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'color': {
        const hex = typeof val === 'string' && val.startsWith('#') ? val : '#111111';
        const contrastRatio = calculateContrastRatio(hex, '#FFFFFF');
        const lowContrast = contrastRatio < 4.5;

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={hex}
                onChange={(e) => onChangeVal(e.target.value)}
                className="w-9 h-9 p-0.5 rounded-lg border border-black/15 cursor-pointer bg-white"
              />
              <input
                type="text"
                value={hex}
                onChange={(e) => onChangeVal(e.target.value)}
                placeholder="#000000"
                maxLength={7}
                className="w-28 px-3 py-2 bg-white rounded-xl border border-black/15 text-xs font-mono text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
              />
              <span className="text-[11px] text-[#6B6B6B]">
                Contrast: {contrastRatio.toFixed(1)}:1
              </span>
            </div>
            {lowContrast && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1 font-medium">
                <AlertTriangle size={12} className="shrink-0" />
                Contrast ratio below WCAG AA recommendation (4.5:1).
              </p>
            )}
          </div>
        );
      }

      case 'image':
        return (
          <div className="space-y-2">
            {val ? (
              <div className="flex items-center gap-3 p-2 bg-[#F3F3F5] rounded-xl border border-black/10">
                <img
                  src={val}
                  alt={field.label}
                  className="w-12 h-12 object-cover rounded-lg bg-white border border-black/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-[#0A0A0A] block truncate">
                    Image configured
                  </span>
                  <span className="text-[10px] text-[#6B6B6B]">
                    Max 1600px, Web-optimized
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onChangeVal('')}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-dashed border-black/25 rounded-xl text-xs text-[#4B5563] hover:border-[#D92D50] hover:text-[#D92D50] cursor-pointer transition-colors">
                <Upload size={14} />
                <span>Upload PNG, JPG, or WebP</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(field.key, file, field.maxSizeBytes);
                    }
                  }}
                />
              </label>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={val}
            onChange={(e) => onChangeVal(e.target.value)}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            className="w-full px-3 py-2 bg-white rounded-xl border border-black/15 text-xs text-[#0A0A0A] focus:outline-none focus:border-[#D92D50]"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Strip: Copy from Client & Creative Shuffle */}
      <div className="flex items-center justify-between gap-3 p-3.5 bg-white rounded-2xl border border-black/10 flex-wrap shadow-2xs">
        <div className="flex items-center gap-2">
          {client && (
            <button
              type="button"
              onClick={handleCopyFromClient}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/15 bg-[#F3F3F5] hover:bg-black/5 text-[#0A0A0A] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            >
              {copiedFromClient ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Copied from {client.businessName}</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy from client record</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleShuffle}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/15 bg-white hover:bg-black/5 text-[#0A0A0A] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Shuffle creative styling and layout options"
          >
            <Shuffle size={13} />
            <span>Shuffle variation</span>
          </button>
        </div>

        {/* Lock controls */}
        <div className="flex items-center gap-3 text-xs text-[#6B6B6B]">
          <button
            type="button"
            onClick={() => setLockedBrand(!lockedBrand)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
              lockedBrand ? 'text-[#D92D50] font-bold' : 'hover:text-[#0A0A0A]'
            }`}
          >
            {lockedBrand ? <Lock size={12} /> : <Unlock size={12} />}
            <span>Lock Brand</span>
          </button>
          <button
            type="button"
            onClick={() => setLockedSections(!lockedSections)}
            className={`inline-flex items-center gap-1 cursor-pointer transition-colors ${
              lockedSections ? 'text-[#D92D50] font-bold' : 'hover:text-[#0A0A0A]'
            }`}
          >
            {lockedSections ? <Lock size={12} /> : <Unlock size={12} />}
            <span>Lock Layout</span>
          </button>
        </div>
      </div>

      {/* Group Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-black/10">
        <button
          type="button"
          onClick={() => setActiveGroup('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeGroup === 'all'
              ? 'bg-[#0A0A0A] text-white shadow-2xs'
              : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
          }`}
        >
          All Fields
        </button>
        {Object.keys(groupedFields).map((grp) => {
          if (groupedFields[grp].length === 0) return null;
          return (
            <button
              key={grp}
              type="button"
              onClick={() => setActiveGroup(grp)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                activeGroup === grp
                  ? 'bg-[#0A0A0A] text-white shadow-2xs'
                  : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
              }`}
            >
              {grp} ({groupedFields[grp].length})
            </button>
          );
        })}
        {manifest.lists && manifest.lists.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveGroup('lists')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeGroup === 'lists'
                ? 'bg-[#0A0A0A] text-white shadow-2xs'
                : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
            }`}
          >
            Dynamic Lists ({manifest.lists.length})
          </button>
        )}
      </div>

      {/* Render Schema Fields */}
      {Object.entries(groupedFields).map(([grp, fields]) => {
        if (fields.length === 0) return null;
        if (activeGroup !== 'all' && activeGroup !== grp) return null;

        return (
          <div key={grp} className="bg-white p-5 rounded-2xl border border-black/10 space-y-4 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D92D50]">
              {grp} Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => {
                const currentVal = getNestedValue(config, field.key);
                const isRequiredMissing = field.required && (currentVal === undefined || currentVal === '');

                return (
                  <div key={field.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#0A0A0A]">
                        {field.label}
                        {field.required && <span className="text-[#D92D50] ml-1">*</span>}
                      </label>
                      {field.maxLength && (
                        <span className="text-[10px] text-[#6B6B6B]">
                          Max {field.maxLength}
                        </span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-[11px] text-[#6B6B6B] leading-tight">
                        {field.description}
                      </p>
                    )}
                    {renderFieldInput(field, currentVal, (val) =>
                      handleFieldChange(field.key, val)
                    )}
                    {isRequiredMissing && (
                      <p className="text-[10px] text-[#D92D50]">This field is required.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Dynamic List Editors */}
      {manifest.lists && (activeGroup === 'all' || activeGroup === 'lists') && (
        <div className="space-y-4">
          {manifest.lists.map((lst: ManifestListField) => {
            const items = (getNestedValue(config, lst.key) || []) as any[];
            const maxItems = lst.maxItems || 10;
            const minItems = lst.minItems || 0;

            return (
              <div key={lst.key} className="bg-white p-5 rounded-2xl border border-black/10 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-black/10 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#0A0A0A]">
                      {lst.label}
                    </h3>
                    <p className="text-[11px] text-[#6B6B6B]">
                      {items.length} of {maxItems} items configured
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddListItem(lst.key, lst.itemFields, maxItems)}
                    disabled={items.length >= maxItems}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A0A0A] hover:bg-black/80 text-white text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Add Item</span>
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-[#6B6B6B] py-3 text-center italic">
                    No items in list. Click "Add Item" to add an entry.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 bg-[#F3F3F5] rounded-xl border border-black/10 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-black/10 pb-2">
                          <span className="text-xs font-bold text-[#0A0A0A]">
                            Item #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveListItem(lst.key, idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                              title="Move up"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveListItem(lst.key, idx, 'down')}
                              disabled={idx === items.length - 1}
                              className="p-1 text-[#6B6B6B] hover:text-[#0A0A0A] disabled:opacity-30 cursor-pointer"
                              title="Move down"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveListItem(lst.key, idx, minItems)}
                              disabled={items.length <= minItems}
                              className="p-1 text-red-600 hover:text-red-700 disabled:opacity-30 cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {lst.itemFields.map((f: ManifestField) => {
                            const subKey = f.key.split('.').pop() || f.key;
                            const fieldVal = item[subKey];

                            return (
                              <div key={f.key} className="space-y-1">
                                <label className="text-[11px] font-semibold text-[#0A0A0A]">
                                  {f.label}
                                </label>
                                {renderFieldInput(f, fieldVal, (val) =>
                                  handleListFieldChange(lst.key, idx, f.key, val)
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
