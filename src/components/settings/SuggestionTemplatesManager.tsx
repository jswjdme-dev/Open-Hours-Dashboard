import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Copy,
  X,
  FileText,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import {
  SuggestionTemplate,
  SuggestionType,
  SuggestionPriceKind,
  ClientPackage,
} from '../../types/index.ts';
import {
  getSuggestionTemplates,
  createSuggestionTemplate,
  updateSuggestionTemplate,
  archiveSuggestionTemplate,
} from '../../data/repo.ts';

interface SuggestionTemplatesManagerProps {
  showToast?: (msg: string) => void;
}

export const SuggestionTemplatesManager: React.FC<SuggestionTemplatesManagerProps> = ({
  showToast = (msg) => console.log(msg),
}) => {
  const [templates, setTemplates] = useState<SuggestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SuggestionTemplate | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formType, setFormType] = useState<SuggestionType>('Add-on');
  const [formTargetPackage, setFormTargetPackage] = useState<ClientPackage | ''>('');
  const [formBenefits, setFormBenefits] = useState<string[]>(['']);
  const [formWhyWeSuggest, setFormWhyWeSuggest] = useState('');
  const [formPriceAmount, setFormPriceAmount] = useState<string>('');
  const [formPriceCurrency, setFormPriceCurrency] = useState('EUR');
  const [formPriceKind, setFormPriceKind] = useState<SuggestionPriceKind>('Monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const list = await getSuggestionTemplates(false);
      setTemplates(list);
    } catch (err) {
      console.error('Failed to load templates:', err);
      showToast('Failed to load suggestion templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const resetForm = () => {
    setFormTitle('');
    setFormSummary('');
    setFormType('Add-on');
    setFormTargetPackage('');
    setFormBenefits(['']);
    setFormWhyWeSuggest('');
    setFormPriceAmount('');
    setFormPriceCurrency('EUR');
    setFormPriceKind('Monthly');
    setEditingTemplate(null);
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (tmpl: SuggestionTemplate) => {
    setEditingTemplate(tmpl);
    setFormTitle(tmpl.title);
    setFormSummary(tmpl.summary);
    setFormType(tmpl.type);
    setFormTargetPackage(tmpl.targetPackage || '');
    setFormBenefits(tmpl.benefits && tmpl.benefits.length > 0 ? [...tmpl.benefits] : ['']);
    setFormWhyWeSuggest(tmpl.whyWeSuggest || '');
    setFormPriceAmount(tmpl.priceAmount !== undefined ? String(tmpl.priceAmount) : '');
    setFormPriceCurrency(tmpl.priceCurrency || 'EUR');
    setFormPriceKind(tmpl.priceKind || 'Monthly');
    setModalOpen(true);
  };

  const handleBenefitChange = (index: number, val: string) => {
    const updated = [...formBenefits];
    updated[index] = val;
    setFormBenefits(updated);
  };

  const addBenefitBullet = () => {
    if (formBenefits.length < 8) {
      setFormBenefits([...formBenefits, '']);
    }
  };

  const removeBenefitBullet = (index: number) => {
    if (formBenefits.length > 1) {
      setFormBenefits(formBenefits.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Please enter a template title.');
      return;
    }
    if (!formSummary.trim()) {
      showToast('Please enter a short summary.');
      return;
    }

    const cleanBenefits = formBenefits.map((b) => b.trim()).filter(Boolean);
    if (cleanBenefits.length === 0) {
      showToast('Please add at least one deliverable bullet point.');
      return;
    }

    setIsSubmitting(true);
    try {
      const priceParsed = formPriceAmount ? parseFloat(formPriceAmount) : undefined;
      const dataPayload = {
        title: formTitle.trim(),
        summary: formSummary.trim(),
        type: formType,
        targetPackage: formTargetPackage ? (formTargetPackage as ClientPackage) : undefined,
        benefits: cleanBenefits,
        whyWeSuggest: formWhyWeSuggest.trim() || undefined,
        priceAmount: priceParsed,
        priceCurrency: formPriceCurrency,
        priceKind: formPriceKind,
      };

      if (editingTemplate) {
        await updateSuggestionTemplate(editingTemplate.id, dataPayload, 'Admin');
        showToast(`Updated template "${formTitle.trim()}".`);
      } else {
        await createSuggestionTemplate(dataPayload, 'Admin');
        showToast(`Created template "${formTitle.trim()}".`);
      }

      setModalOpen(false);
      resetForm();
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      showToast(err?.message || 'Failed to save template.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tmpl: SuggestionTemplate) => {
    if (confirm(`Archive template "${tmpl.title}"? Existing client suggestions will remain intact.`)) {
      try {
        await archiveSuggestionTemplate(tmpl.id, 'Admin');
        showToast(`Archived template "${tmpl.title}".`);
        loadTemplates();
      } catch {
        showToast('Failed to archive template.');
      }
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (typeFilter === 'all') return true;
    return t.type.toLowerCase() === typeFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-[20px] border border-black/5 shadow-2xs">
        <div>
          <h3 className="font-bold text-base text-[#111111]">Client Suggestion Templates</h3>
          <p className="text-xs text-[#6B6B6B] mt-0.5">
            Pre-configured upgrade and add-on proposals used across client accounts to suggest timely expansions.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0"
        >
          <Plus size={14} />
          <span>New Template</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'All Templates' },
          { id: 'Package upgrade', label: 'Package upgrades' },
          { id: 'Add-on', label: 'Add-ons' },
          { id: 'Improvement', label: 'Improvements' },
        ].map((f) => {
          const isActive = typeFilter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setTypeFilter(f.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#111111] text-white shadow-2xs'
                  : 'bg-white text-[#6B6B6B] border border-black/5 hover:text-[#111111]'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#A8A5A5] bg-white rounded-[20px] border border-black/5">
          Loading suggestion templates...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[20px] border border-black/5 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center mx-auto">
            <Sparkles size={22} />
          </div>
          <div className="font-bold text-sm text-[#111111]">No suggestion templates</div>
          <p className="text-xs text-[#6B6B6B] max-w-sm mx-auto">
            Create standard service templates like local SEO expansions or performance tuning to quickly suggest to clients.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-4 py-2 rounded-full bg-[#111111] text-white text-xs font-bold hover:bg-[#D92D50] cursor-pointer"
          >
            Create first template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-white rounded-[20px] p-5 border border-black/5 shadow-2xs flex flex-col justify-between space-y-4 hover:border-black/15 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-[#F4F2F2] text-[#6B6B6B]">
                      {tmpl.type}
                    </span>
                    {tmpl.targetPackage && (
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        {tmpl.targetPackage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(tmpl)}
                      className="p-1 text-gray-400 hover:text-black rounded cursor-pointer"
                      title="Edit template"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tmpl)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded cursor-pointer"
                      title="Archive template"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-[#111111] leading-tight">{tmpl.title}</h4>
                  <p className="text-xs text-[#6B6B6B] mt-1 leading-relaxed line-clamp-2">
                    {tmpl.summary}
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#A8A5A5]">
                    Included Deliverables ({tmpl.benefits.length})
                  </div>
                  <div className="space-y-1">
                    {tmpl.benefits.slice(0, 3).map((b, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 text-xs text-[#344054]">
                        <CheckCircle2 size={12} className="text-emerald-600 mt-0.5 shrink-0" />
                        <span className="line-clamp-1">{b}</span>
                      </div>
                    ))}
                    {tmpl.benefits.length > 3 && (
                      <div className="text-[11px] text-[#A8A5A5] pl-4">
                        +{tmpl.benefits.length - 3} more deliverables
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Price indicator */}
              <div className="pt-3 border-t border-black/5 flex items-center justify-between text-xs">
                <span className="text-[#6B6B6B]">Estimated Price:</span>
                <span className="font-bold text-[#111111]">
                  {tmpl.priceAmount !== undefined
                    ? `€${tmpl.priceAmount.toLocaleString()} / ${
                        tmpl.priceKind === 'Monthly' ? 'mo' : 'one-time'
                      }`
                    : 'Custom'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TEMPLATE */}
      {/* ========================================================================= */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-black/10 space-y-4 my-8"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#111111]">
                  {editingTemplate ? 'Edit Suggestion Template' : 'New Suggestion Template'}
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Define default deliverables and rationale for reusable upgrade proposals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Type and Target Package */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as SuggestionType)}
                    className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="Package upgrade">Package upgrade</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Improvement">Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Target Package (Optional)</label>
                  <select
                    value={formTargetPackage}
                    onChange={(e) => setFormTargetPackage(e.target.value as ClientPackage | '')}
                    className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="">None / Add-on</option>
                    <option value="Regular">Regular</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-bold text-[#111111] mb-1">Template Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Local SEO Multi-Location Expansion"
                  className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block font-bold text-[#111111] mb-1">Summary *</label>
                <textarea
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Brief description of the recommendation..."
                  className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>

              {/* Price Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#111111] mb-1">Default Price (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formPriceAmount}
                    onChange={(e) => setFormPriceAmount(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#111111] mb-1">Billing Kind</label>
                  <select
                    value={formPriceKind}
                    onChange={(e) => setFormPriceKind(e.target.value as SuggestionPriceKind)}
                    className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="One-time">One-time</option>
                  </select>
                </div>
              </div>

              {/* Deliverables */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-[#111111]">
                    What you&apos;d get (1–8 deliverables) *
                  </label>
                  {formBenefits.length < 8 && (
                    <button
                      type="button"
                      onClick={addBenefitBullet}
                      className="text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>Add deliverable</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {formBenefits.map((b, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#A8A5A5] w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={b}
                        onChange={(e) => handleBenefitChange(idx, e.target.value)}
                        placeholder={`Deliverable #${idx + 1}`}
                        className="flex-1 bg-[#F4F2F2] px-3 py-1.5 rounded-xl border border-black/5 focus:outline-none"
                      />
                      {formBenefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBenefitBullet(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Why we suggest this */}
              <div>
                <label className="block font-bold text-[#111111] mb-1">
                  Default &ldquo;Why we suggest this&rdquo; text
                </label>
                <textarea
                  rows={2}
                  value={formWhyWeSuggest}
                  onChange={(e) => setFormWhyWeSuggest(e.target.value)}
                  placeholder="Rationale explaining the business impact..."
                  className="w-full bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-full bg-[#111111] hover:bg-[#D92D50] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                {isSubmitting ? 'Saving...' : editingTemplate ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
