import React, { useState, useEffect } from 'react';
import {
  Plus,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Edit2,
  Trash2,
  Check,
  X,
  FileText,
} from 'lucide-react';
import {
  LeadCustomFieldDefinition,
  CustomFieldType,
} from '../../types/index.ts';
import {
  getLeadCustomFieldDefinitions,
  saveLeadCustomFieldDefinition,
  archiveLeadCustomFieldDefinition,
} from '../../data/repo.ts';

const FIELD_TYPES: Array<{ value: CustomFieldType; label: string }> = [
  { value: 'text', label: 'Short Text' },
  { value: 'long text', label: 'Long Text / Notes' },
  { value: 'number', label: 'Number' },
  { value: 'url', label: 'Web URL' },
  { value: 'date', label: 'Date' },
  { value: 'yes/no', label: 'Yes / No Toggle' },
  { value: 'single select', label: 'Single Select Dropdown' },
];

export const LeadFieldsManager: React.FC = () => {
  const [fields, setFields] = useState<LeadCustomFieldDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [key, setKey] = useState('');
  const [type, setType] = useState<CustomFieldType>('text');
  const [optionsStr, setOptionsStr] = useState('');
  const [required, setRequired] = useState(false);
  const [showInList, setShowInList] = useState(false);
  const [searchable, setSearchable] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3500);
  };

  const loadFields = async () => {
    setLoading(true);
    try {
      const data = await getLeadCustomFieldDefinitions();
      setFields(data);
    } catch {
      showToast('Failed to load lead field definitions.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setLabel('');
    setKey('');
    setType('text');
    setOptionsStr('');
    setRequired(false);
    setShowInList(false);
    setSearchable(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (field: LeadCustomFieldDefinition) => {
    setEditingId(field.id);
    setLabel(field.label);
    setKey(field.key);
    setType(field.type);
    setOptionsStr((field.options || []).join(', '));
    setRequired(Boolean(field.required));
    setShowInList(Boolean(field.showInList));
    setSearchable(field.searchable !== false);
    setIsModalOpen(true);
  };

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!editingId) {
      const slug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setKey(slug);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !key.trim()) {
      showToast('Label and key are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const options =
        type === 'single select'
          ? optionsStr
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

      await saveLeadCustomFieldDefinition({
        id: editingId || undefined,
        label: label.trim(),
        key: key.trim(),
        type,
        options,
        required,
        showInList,
        searchable,
      });

      showToast(`Custom field "${label}" saved successfully.`);
      setIsModalOpen(false);
      await loadFields();
    } catch (err: any) {
      showToast(err?.message || 'Failed to save field.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (id: string, name: string) => {
    if (!confirm(`Archive custom field "${name}"? Existing lead values will be preserved.`)) return;
    try {
      await archiveLeadCustomFieldDefinition(id);
      showToast(`Field "${name}" archived.`);
      await loadFields();
    } catch {
      showToast('Failed to archive field.', 'error');
    }
  };

  const displayedFields = fields.filter((f) => (showArchived ? true : !f.archived));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5">
        <div>
          <span className="inline-block px-3 py-1 bg-black text-white text-[11px] font-bold rounded-full mb-2">
            Schema Configuration
          </span>
          <h2 className="text-xl font-bold text-[#111111]">Lead Custom Fields</h2>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Define custom metadata attributes for prospect leads with live form validation and CSV mapping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowArchived(!showArchived)}
            className={`px-3 py-2 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border ${
              showArchived
                ? 'bg-[#111111] text-white border-black'
                : 'bg-white text-[#6B6B6B] border-black/10 hover:text-[#111111]'
            }`}
          >
            <Archive size={13} />
            <span>{showArchived ? 'Hide Archived' : 'Show Archived'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNew}
            className="px-4 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Custom Field</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Fields List */}
      <div className="bg-white rounded-[24px] border border-black/5 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#6B6B6B]">
            Loading field definitions...
          </div>
        ) : displayedFields.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#6B6B6B] space-y-2">
            <Sliders size={24} className="text-[#A8A5A5] mx-auto" />
            <div className="font-bold text-[#111111]">No custom fields defined</div>
            <p>Click &ldquo;Add Custom Field&rdquo; above to create your first lead attribute.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F7F7] border-b border-black/5 text-[#A8A5A5] uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-5">Label</th>
                  <th className="py-3 px-4">Key</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Options / Config</th>
                  <th className="py-3 px-4">Visibility</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {displayedFields.map((field) => (
                  <tr key={field.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 px-5 font-bold text-[#111111]">
                      {field.label}
                      {field.required && (
                        <span className="text-[#D92D50] ml-1" title="Required field">*</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#6B6B6B]">
                      {field.key}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-[#111111] capitalize">
                      {field.type}
                    </td>

                    <td className="py-3.5 px-4 text-[#6B6B6B] max-w-[200px] truncate">
                      {field.options && field.options.length > 0
                        ? field.options.join(', ')
                        : '—'}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {field.showInList && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
                            Table Column
                          </span>
                        )}
                        {field.searchable !== false && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold text-[10px]">
                            Searchable
                          </span>
                        )}
                        {field.required && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px]">
                            Required
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          field.archived
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {field.archived ? 'Archived' : 'Active'}
                      </span>
                    </td>

                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(field)}
                          className="p-1.5 text-gray-500 hover:text-[#111111] rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          title="Edit field"
                        >
                          <Edit2 size={13} />
                        </button>
                        {!field.archived && (
                          <button
                            type="button"
                            onClick={() => handleArchive(field.id, field.label)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            title="Archive field"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-lg w-full p-6 border border-black/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D92D50]">
                  {editingId ? 'Edit Custom Field' : 'New Custom Field'}
                </span>
                <h3 className="text-lg font-bold text-[#111111]">
                  {editingId ? 'Update Field Definition' : 'Define Lead Attribute'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Field Label *
                  </label>
                  <input
                    type="text"
                    required
                    value={label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    placeholder="e.g. Industry Sector"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Attribute Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. industry_sector"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Field Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as CustomFieldType)}
                  className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50] cursor-pointer"
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {type === 'single select' && (
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Dropdown Options (Comma-separated)
                  </label>
                  <input
                    type="text"
                    required
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full px-3 py-2 text-xs bg-[#F8F7F7] border border-black/10 rounded-xl focus:outline-none focus:border-[#D92D50]"
                  />
                  <span className="text-[10px] text-[#A8A5A5] mt-0.5 block">
                    Clients and leads will choose from this pre-defined list.
                  </span>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-black/5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={(e) => setRequired(e.target.checked)}
                    className="rounded accent-[#D92D50]"
                  />
                  <span className="text-xs font-semibold text-[#111111]">
                    Required field when creating or editing a lead
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showInList}
                    onChange={(e) => setShowInList(e.target.checked)}
                    className="rounded accent-[#D92D50]"
                  />
                  <span className="text-xs font-semibold text-[#111111]">
                    Display column in Leads table
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchable}
                    onChange={(e) => setSearchable(e.target.checked)}
                    className="rounded accent-[#D92D50]"
                  />
                  <span className="text-xs font-semibold text-[#111111]">
                    Include field value in global lead search filter
                  </span>
                </label>
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-full text-xs font-bold bg-[#111111] hover:bg-[#D92D50] text-white transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Field' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
