import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Send,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  FileText,
  DollarSign,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  Copy,
  Check,
  Building,
  Layers,
  MessageSquare,
} from 'lucide-react';
import {
  Client,
  ClientPackage,
  ClientSuggestion,
  SuggestionTemplate,
  SuggestionType,
  SuggestionStatus,
  SuggestionPriceKind,
} from '../../types/index.ts';
import {
  getClientSuggestions,
  getSuggestionTemplates,
  createClientSuggestion,
  createClientSuggestionFromTemplate,
  updateClientSuggestion,
  shareClientSuggestion,
  archiveClientSuggestion,
  acceptClientSuggestion,
  getClientSuggestionStats,
  contentGuardCheck,
} from '../../data/repo.ts';

interface ClientSuggestionsManagerProps {
  client: Client;
  onClientUpdated?: (updated: Client) => void;
  showToast: (msg: string) => void;
}

export const ClientSuggestionsManager: React.FC<ClientSuggestionsManagerProps> = ({
  client,
  onClientUpdated,
  showToast,
}) => {
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [templates, setTemplates] = useState<SuggestionTemplate[]>([]);
  const [stats, setStats] = useState<{
    sharedCount: number;
    interestedRate: number;
    acceptedCount: number;
    totalCount: number;
  }>({
    sharedCount: 0,
    interestedRate: 0,
    acceptedCount: 0,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modals
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [editingSuggestion, setEditingSuggestion] = useState<ClientSuggestion | null>(null);
  const [acceptModalSuggestion, setAcceptModalSuggestion] = useState<ClientSuggestion | null>(null);
  const [selectedNewPackage, setSelectedNewPackage] = useState<ClientPackage>(client.package);
  const [contentGuardModal, setContentGuardModal] = useState<{
    suggestion: ClientSuggestion;
    flaggedWords: string[];
    confirmed: boolean;
  } | null>(null);

  // Form states for New / Edit suggestion
  const [formTitle, setFormTitle] = useState('');
  const [formSummary, setFormSummary] = useState('');
  const [formType, setFormType] = useState<SuggestionType>('Add-on');
  const [formTargetPackage, setFormTargetPackage] = useState<ClientPackage | ''>('');
  const [formBenefits, setFormBenefits] = useState<string[]>(['']);
  const [formWhyWeSuggest, setFormWhyWeSuggest] = useState('');
  const [formPriceAmount, setFormPriceAmount] = useState<string>('');
  const [formPriceCurrency, setFormPriceCurrency] = useState('EUR');
  const [formPriceKind, setFormPriceKind] = useState<SuggestionPriceKind>('Monthly');
  const [formValidUntil, setFormValidUntil] = useState('');
  const [formGuardConfirmed, setFormGuardConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, tmpls, statsData] = await Promise.all([
        getClientSuggestions(client.id, false),
        getSuggestionTemplates(false),
        getClientSuggestionStats(client.id),
      ]);
      setSuggestions(list);
      setTemplates(tmpls);
      setStats(statsData);
      // Auto-expand all by default
      setExpandedIds(new Set(list.map((s) => s.id)));
    } catch (err) {
      console.error('Failed to load client suggestions:', err);
      showToast('Failed to load suggestions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [client.id]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Form Reset
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
    setFormValidUntil('');
    setFormGuardConfirmed(false);
    setEditingSuggestion(null);
  };

  const openCreateModal = () => {
    resetForm();
    setNewModalOpen(true);
  };

  const openEditModal = (s: ClientSuggestion) => {
    setEditingSuggestion(s);
    setFormTitle(s.title);
    setFormSummary(s.summary);
    setFormType(s.type);
    setFormTargetPackage(s.targetPackage || '');
    setFormBenefits(s.benefits && s.benefits.length > 0 ? [...s.benefits] : ['']);
    setFormWhyWeSuggest(s.whyWeSuggest || '');
    setFormPriceAmount(s.priceAmount !== undefined ? String(s.priceAmount) : '');
    setFormPriceCurrency(s.priceCurrency || 'EUR');
    setFormPriceKind(s.priceKind || 'Monthly');
    setFormValidUntil(s.validUntil || '');
    setFormGuardConfirmed(false);
    setNewModalOpen(true);
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

  // Content guard check for current form values
  const activeGuard = useMemo(() => {
    return contentGuardCheck(formTitle, formSummary, formBenefits.filter((b) => b.trim().length > 0));
  }, [formTitle, formSummary, formBenefits]);

  const handleSaveSuggestion = async (shareNow = false) => {
    if (!formTitle.trim()) {
      showToast('Please enter a suggestion title.');
      return;
    }
    if (!formSummary.trim()) {
      showToast('Please enter a short summary.');
      return;
    }

    const cleanBenefits = formBenefits.map((b) => b.trim()).filter(Boolean);
    if (cleanBenefits.length === 0) {
      showToast('Please add at least one benefit bullet point.');
      return;
    }

    if (shareNow && activeGuard.hasWarning && !formGuardConfirmed) {
      showToast('Content guard warning: Please confirm you are not promising specific results.');
      return;
    }

    setIsSubmitting(true);
    try {
      const priceParsed = formPriceAmount ? parseFloat(formPriceAmount) : undefined;
      const dataPayload = {
        clientId: client.id,
        title: formTitle.trim(),
        summary: formSummary.trim(),
        type: formType,
        targetPackage: formTargetPackage ? (formTargetPackage as ClientPackage) : undefined,
        benefits: cleanBenefits,
        whyWeSuggest: formWhyWeSuggest.trim() || undefined,
        priceAmount: priceParsed,
        priceCurrency: formPriceCurrency,
        priceKind: formPriceKind,
        validUntil: formValidUntil || undefined,
        status: (shareNow ? 'Shared' : 'Draft') as SuggestionStatus,
        visibleToClient: shareNow,
        sharedAt: shareNow ? new Date().toISOString() : undefined,
      };

      if (editingSuggestion) {
        await updateClientSuggestion(editingSuggestion.id, dataPayload, 'Admin');
        showToast(`Updated suggestion "${formTitle.trim()}"`);
      } else {
        await createClientSuggestion(dataPayload, 'Admin');
        showToast(
          shareNow
            ? `Created & shared "${formTitle.trim()}" with client`
            : `Saved draft suggestion "${formTitle.trim()}"`
        );
      }

      setNewModalOpen(false);
      resetForm();
      loadData();
    } catch (err: any) {
      console.error('Failed to save suggestion:', err);
      showToast(err?.message || 'Failed to save suggestion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickTemplate = (tmpl: SuggestionTemplate) => {
    setFormTitle(tmpl.title);
    setFormSummary(tmpl.summary);
    setFormType(tmpl.type);
    setFormTargetPackage(tmpl.targetPackage || '');
    setFormBenefits(tmpl.benefits && tmpl.benefits.length > 0 ? [...tmpl.benefits] : ['']);
    setFormWhyWeSuggest(tmpl.whyWeSuggest || '');
    setFormPriceAmount(tmpl.priceAmount !== undefined ? String(tmpl.priceAmount) : '');
    setFormPriceCurrency(tmpl.priceCurrency || 'EUR');
    setFormPriceKind(tmpl.priceKind || 'Monthly');
    setFormValidUntil('');
    setFormGuardConfirmed(false);
    setTemplatePickerOpen(false);
    setNewModalOpen(true);
  };

  const handleShareClick = async (suggestion: ClientSuggestion) => {
    const guard = contentGuardCheck(suggestion.title, suggestion.summary, suggestion.benefits);
    if (guard.hasWarning) {
      setContentGuardModal({
        suggestion,
        flaggedWords: guard.flaggedWords,
        confirmed: false,
      });
      return;
    }

    try {
      await shareClientSuggestion(suggestion.id, false, 'Admin');
      showToast(`Shared "${suggestion.title}" with ${client.businessName}. It is now visible in their portal.`);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to share suggestion.');
    }
  };

  const handleConfirmGuardShare = async () => {
    if (!contentGuardModal) return;
    if (!contentGuardModal.confirmed) {
      showToast('Please tick the confirmation checkbox.');
      return;
    }

    try {
      await shareClientSuggestion(contentGuardModal.suggestion.id, true, 'Admin');
      showToast(`Shared "${contentGuardModal.suggestion.title}" with client.`);
      setContentGuardModal(null);
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to share suggestion.');
    }
  };

  const handleArchive = async (suggestion: ClientSuggestion) => {
    if (confirm(`Archive suggestion "${suggestion.title}"?`)) {
      try {
        await archiveClientSuggestion(suggestion.id, 'Admin');
        showToast(`Archived "${suggestion.title}".`);
        loadData();
      } catch {
        showToast('Failed to archive suggestion.');
      }
    }
  };

  const handleOpenAcceptModal = (suggestion: ClientSuggestion) => {
    setAcceptModalSuggestion(suggestion);
    setSelectedNewPackage(suggestion.targetPackage || client.package);
  };

  const handleConfirmAccept = async () => {
    if (!acceptModalSuggestion) return;
    try {
      const res = await acceptClientSuggestion(acceptModalSuggestion.id, selectedNewPackage, 'Admin');
      showToast(`Suggestion marked Accepted. Client package updated to "${res.client.package}".`);
      setAcceptModalSuggestion(null);
      if (onClientUpdated) {
        onClientUpdated(res.client);
      }
      loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to mark as accepted.');
    }
  };

  const filteredSuggestions = suggestions.filter((s) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'snoozed') return s.status === 'Not now' || s.status === 'Not for us';
    return s.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total suggestions card */}
        <div className="bg-white p-5 rounded-[20px] border border-black/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-semibold">
            <span>Total Suggestions</span>
            <Sparkles size={15} className="text-[#D92D50]" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">{stats.totalCount}</div>
          <div className="text-[11px] text-[#A8A5A5]">Created for this client</div>
        </div>

        {/* Shared suggestions card */}
        <div className="bg-white p-5 rounded-[20px] border border-black/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-semibold">
            <span>Shared with Client</span>
            <Send size={15} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">{stats.sharedCount}</div>
          <div className="text-[11px] text-[#A8A5A5]">Live on client portal</div>
        </div>

        {/* Interested rate card */}
        <div className="bg-white p-5 rounded-[20px] border border-black/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-semibold">
            <span>Interested Rate</span>
            <Clock size={15} className="text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#111111]">{stats.interestedRate}%</div>
          <div className="text-[11px] text-[#A8A5A5]">Interested or accepted</div>
        </div>

        {/* Accepted count card */}
        <div className="bg-white p-5 rounded-[20px] border border-black/5 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-[#6B6B6B] text-xs font-semibold">
            <span>Accepted</span>
            <CheckCircle2 size={15} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">{stats.acceptedCount}</div>
          <div className="text-[11px] text-[#A8A5A5]">Won upgrades & add-ons</div>
        </div>
      </div>

      {/* 2. Controls & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-[20px] border border-black/5 shadow-2xs">
        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'Draft', label: 'Drafts' },
            { id: 'Shared', label: 'Shared' },
            { id: 'Interested', label: 'Interested' },
            { id: 'Accepted', label: 'Accepted' },
            { id: 'snoozed', label: 'Not now / Sidelined' },
          ].map((flt) => {
            const isActive = statusFilter === flt.id;
            return (
              <button
                key={flt.id}
                type="button"
                onClick={() => setStatusFilter(flt.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[#111111] text-white shadow-2xs'
                    : 'bg-[#F4F2F2] text-[#6B6B6B] hover:text-[#111111]'
                }`}
              >
                {flt.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setTemplatePickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#F4F2F2] hover:bg-black/5 text-[#111111] text-xs font-bold transition-all cursor-pointer border border-black/5"
          >
            <Copy size={13} />
            <span>Create from template</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#D92D50] hover:bg-[#b52240] text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            <Plus size={14} />
            <span>New suggestion</span>
          </button>
        </div>
      </div>

      {/* 3. Suggestions List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-[#A8A5A5] bg-white rounded-[24px] border border-black/5">
          Loading recommendations...
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-[24px] border border-black/5 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#FCE9ED] text-[#D92D50] flex items-center justify-center mx-auto">
            <Sparkles size={22} />
          </div>
          <div className="font-bold text-sm text-[#111111]">No suggestions found</div>
          <p className="text-xs text-[#6B6B6B] max-w-md mx-auto">
            {statusFilter !== 'all'
              ? `No suggestions with status "${statusFilter}". Try changing the filter.`
              : 'Recommend package upgrades, performance tuning, or local SEO add-ons to help this client grow.'}
          </p>
          {statusFilter === 'all' && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTemplatePickerOpen(true)}
                className="px-4 py-2 rounded-full bg-[#F4F2F2] text-[#111111] text-xs font-bold hover:bg-black/5 cursor-pointer"
              >
                Browse templates
              </button>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-4 py-2 rounded-full bg-[#D92D50] text-white text-xs font-bold hover:bg-[#b52240] cursor-pointer"
              >
                Create custom suggestion
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSuggestions.map((s) => {
            const isExpanded = expandedIds.has(s.id);
            const guard = contentGuardCheck(s.title, s.summary, s.benefits);

            return (
              <div
                key={s.id}
                className={`bg-white rounded-[24px] border transition-all ${
                  s.status === 'Accepted'
                    ? 'border-emerald-200 shadow-2xs'
                    : s.status === 'Interested'
                    ? 'border-amber-300 shadow-sm'
                    : s.status === 'Shared'
                    ? 'border-blue-200'
                    : 'border-black/5'
                }`}
              >
                {/* Header row */}
                <div className="p-5 flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type Badge */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-[#F4F2F2] text-[#6B6B6B]">
                        {s.type}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                          s.status === 'Accepted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : s.status === 'Interested'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300'
                            : s.status === 'Shared'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : s.status === 'Not now' || s.status === 'Not for us'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {s.status === 'Accepted' && <CheckCircle2 size={12} />}
                        {s.status === 'Interested' && <Sparkles size={12} />}
                        {s.status === 'Shared' && <Send size={11} />}
                        <span>Status: {s.status}</span>
                      </span>

                      {/* Target Package */}
                      {s.targetPackage && (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Target: {s.targetPackage}
                        </span>
                      )}

                      {/* Price Badge */}
                      {s.priceAmount !== undefined && (
                        <span className="text-xs font-bold text-[#111111] bg-black/5 px-2.5 py-0.5 rounded-full">
                          Estimated €{s.priceAmount.toLocaleString()}
                          {s.priceKind === 'Monthly' ? ' / month' : ' one-time'}
                        </span>
                      )}

                      {/* Valid Until */}
                      {s.validUntil && (
                        <span className="text-[11px] text-[#A8A5A5] flex items-center gap-1">
                          <Calendar size={12} />
                          Valid until {s.validUntil}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#111111] tracking-tight">{s.title}</h3>
                    <p className="text-xs text-[#6B6B6B] leading-relaxed line-clamp-2">{s.summary}</p>

                    {/* Guard Warning Banner if draft contains restricted words */}
                    {s.status === 'Draft' && guard.hasWarning && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
                        <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                        <span>
                          <strong>Content Guard Notice:</strong> Contains restricted claim words ({guard.flaggedWords.join(', ')}). A disclaimer will be required before sharing with the client.
                        </span>
                      </div>
                    )}

                    {/* Client response feedback if any */}
                    {s.clientNote && (
                      <div className="p-3 bg-[#FAF8F8] border border-black/5 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-[#111111] flex items-center gap-1.5 text-[11px]">
                          <MessageSquare size={13} className="text-[#D92D50]" />
                          <span>Client Feedback Note:</span>
                        </div>
                        <p className="italic text-[#475467]">&ldquo;{s.clientNote}&rdquo;</p>
                      </div>
                    )}

                    {/* Snooze note */}
                    {s.snoozedUntil && (
                      <div className="text-[11px] text-[#A8A5A5] flex items-center gap-1">
                        <Clock size={12} />
                        Client requested to snooze. Hidden from client portal until {s.snoozedUntil}.
                      </div>
                    )}
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Share action for Draft */}
                    {s.status === 'Draft' && (
                      <button
                        type="button"
                        onClick={() => handleShareClick(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="Publish and make visible on client portal"
                      >
                        <Send size={12} />
                        <span>Share with client</span>
                      </button>
                    )}

                    {/* Mark Accepted for Shared or Interested */}
                    {(s.status === 'Shared' || s.status === 'Interested') && (
                      <button
                        type="button"
                        onClick={() => handleOpenAcceptModal(s)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="Mark client accepted and optionally update package"
                      >
                        <Check size={12} />
                        <span>Mark Accepted</span>
                      </button>
                    )}

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(s)}
                      className="p-1.5 text-gray-500 hover:text-black rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                      title="Edit suggestion"
                    >
                      <Edit2 size={14} />
                    </button>

                    {/* Archive button */}
                    <button
                      type="button"
                      onClick={() => handleArchive(s)}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Archive suggestion"
                    >
                      <Trash2 size={14} />
                    </button>

                    {/* Toggle expand */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(s.id)}
                      className="p-1.5 text-gray-400 hover:text-black rounded-lg hover:bg-black/5 transition-colors cursor-pointer"
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-black/5 space-y-4 text-xs">
                    {/* Benefits bullets */}
                    <div>
                      <div className="font-bold text-[#111111] mb-2 uppercase text-[10.5px] tracking-wider text-[#A8A5A5]">
                        What you&apos;d get (Deliverables)
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {s.benefits.map((b, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-[#111111]">
                            <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                            <span>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Why we suggest */}
                    {s.whyWeSuggest && (
                      <div className="p-3 bg-[#FAF8F8] rounded-xl border border-black/5 space-y-1">
                        <div className="font-bold text-[11px] text-[#111111]">Why we suggest this:</div>
                        <p className="text-xs text-[#475467]">{s.whyWeSuggest}</p>
                      </div>
                    )}

                    {/* Meta info strip */}
                    <div className="flex items-center justify-between text-[11px] text-[#A8A5A5] pt-2 border-t border-black/5 flex-wrap gap-2">
                      <div>
                        Created: {s.createdAt.split('T')[0]}
                        {s.sharedAt && ` · Shared: ${s.sharedAt.split('T')[0]}`}
                        {s.respondedAt && ` · Responded: ${s.respondedAt.split('T')[0]}`}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-[#6B6B6B]">Visible in portal:</span>
                        <span
                          className={`font-bold ${
                            s.visibleToClient && s.status === 'Shared'
                              ? 'text-emerald-600'
                              : 'text-[#A8A5A5]'
                          }`}
                        >
                          {s.visibleToClient && s.status === 'Shared' ? 'Yes (Live)' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT SUGGESTION */}
      {/* ========================================================================= */}
      {newModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-black/10 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-black/5 pb-4">
              <div>
                <h3 className="font-bold text-base text-[#111111]">
                  {editingSuggestion ? 'Edit Suggestion' : 'New Suggestion'}
                </h3>
                <p className="text-xs text-[#6B6B6B]">
                  Tailor a service upgrade or performance improvement recommendation for {client.businessName}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Type and Target Package */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Suggestion Type *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as SuggestionType)}
                    className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="Package upgrade">Package upgrade</option>
                    <option value="Add-on">Add-on</option>
                    <option value="Improvement">Improvement</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Target Package (Optional)
                  </label>
                  <select
                    value={formTargetPackage}
                    onChange={(e) => setFormTargetPackage(e.target.value as ClientPackage | '')}
                    className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="">None / Not a package upgrade</option>
                    <option value="Regular">Regular</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Premium">Premium</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Title *</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Local SEO Multi-Location Expansion"
                  className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">Short Summary *</label>
                <textarea
                  rows={2}
                  value={formSummary}
                  onChange={(e) => setFormSummary(e.target.value)}
                  placeholder="Explain high-level value in 1-2 clear sentences..."
                  className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>

              {/* Price Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Estimated Price (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={formPriceAmount}
                    onChange={(e) => setFormPriceAmount(e.target.value)}
                    placeholder="e.g. 450"
                    className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Billing Kind</label>
                  <select
                    value={formPriceKind}
                    onChange={(e) => setFormPriceKind(e.target.value as SuggestionPriceKind)}
                    className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none cursor-pointer"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="One-time">One-time</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">
                    Valid Until (Optional)
                  </label>
                  <input
                    type="date"
                    value={formValidUntil}
                    onChange={(e) => setFormValidUntil(e.target.value)}
                    className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                  />
                </div>
              </div>

              {/* Benefits (Bullets: What you'd get) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#111111]">
                    What you&apos;d get (1–8 bullet points) *
                  </label>
                  {formBenefits.length < 8 && (
                    <button
                      type="button"
                      onClick={addBenefitBullet}
                      className="text-[11px] font-bold text-[#D92D50] hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <Plus size={12} />
                      <span>Add bullet</span>
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
                        placeholder={`Deliverable bullet #${idx + 1}`}
                        className="flex-1 text-xs bg-[#F4F2F2] px-3 py-1.5 rounded-xl border border-black/5 focus:outline-none"
                      />
                      {formBenefits.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBenefitBullet(idx)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded cursor-pointer"
                          title="Remove bullet"
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
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Why we suggest this (Client-facing rationale)
                </label>
                <textarea
                  rows={2}
                  value={formWhyWeSuggest}
                  onChange={(e) => setFormWhyWeSuggest(e.target.value)}
                  placeholder="Explain why this upgrade is timely based on their recent performance data..."
                  className="w-full text-xs bg-[#F4F2F2] px-3 py-2 rounded-xl border border-black/5 focus:outline-none"
                />
              </div>

              {/* Content Guard Warning & Confirmation Box */}
              {activeGuard.hasWarning && (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-2 text-xs text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <ShieldAlert size={16} className="text-amber-600" />
                    <span>Content Guard: Specific Outcome Claims Detected</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed">
                    This copy contains terms like &ldquo;{activeGuard.flaggedWords.join(', ')}&rdquo;. Our agency policy prohibits guaranteeing specific rankings or outcome metrics.
                  </p>
                  <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formGuardConfirmed}
                      onChange={(e) => setFormGuardConfirmed(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#D92D50] cursor-pointer"
                    />
                    <span className="font-semibold text-xs text-black">
                      I am not promising specific results
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between border-t border-black/5 pt-4">
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveSuggestion(false)}
                  className="px-4 py-2 rounded-full bg-[#F4F2F2] hover:bg-black/5 text-[#111111] text-xs font-bold transition-all cursor-pointer border border-black/5"
                >
                  Save as Draft
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || (activeGuard.hasWarning && !formGuardConfirmed)}
                  onClick={() => handleSaveSuggestion(true)}
                  className={`px-4 py-2 rounded-full text-xs font-bold text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 ${
                    activeGuard.hasWarning && !formGuardConfirmed
                      ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                      : 'bg-[#D92D50] hover:bg-[#b52240]'
                  }`}
                >
                  <Send size={13} />
                  <span>Share with client</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TEMPLATE PICKER */}
      {/* ========================================================================= */}
      {templatePickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-xl w-full p-6 shadow-2xl border border-black/10 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div>
                <h3 className="font-bold text-base text-[#111111]">Choose a Suggestion Template</h3>
                <p className="text-xs text-[#6B6B6B]">
                  Pre-populates deliverables and estimated pricing. You can customize before sharing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTemplatePickerOpen(false)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#A8A5A5]">
                No templates configured. Go to Settings &gt; Suggestion templates to add templates.
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    onClick={() => handlePickTemplate(tmpl)}
                    className="p-4 rounded-[18px] border border-black/5 hover:border-[#D92D50] hover:shadow-xs transition-all cursor-pointer bg-white group space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#F4F2F2] text-[#6B6B6B]">
                          {tmpl.type}
                        </span>
                        {tmpl.targetPackage && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700">
                            Upgrade to {tmpl.targetPackage}
                          </span>
                        )}
                      </div>
                      {tmpl.priceAmount !== undefined && (
                        <span className="text-xs font-bold text-[#111111]">
                          €{tmpl.priceAmount} / {tmpl.priceKind === 'Monthly' ? 'mo' : 'one-time'}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-[#111111] group-hover:text-[#D92D50] transition-colors">
                      {tmpl.title}
                    </h4>
                    <p className="text-xs text-[#6B6B6B]">{tmpl.summary}</p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-[#A8A5A5]">{tmpl.benefits.length} deliverables included</span>
                      <span className="text-[#D92D50] font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        <span>Select</span>
                        <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONTENT GUARD CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {contentGuardModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-amber-300 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-800">
              <ShieldAlert size={20} className="text-amber-600" />
              <h3 className="font-bold text-base text-[#111111]">Content Guard Notice</h3>
            </div>

            <p className="text-xs text-[#475467] leading-relaxed">
              This suggestion contains restricted outcome wording:
              <strong className="text-black"> &ldquo;{contentGuardModal.flaggedWords.join(', ')}&rdquo;</strong>.
              Please confirm you are not promising specific ranking, customer volume, or revenue outcomes.
            </p>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={contentGuardModal.confirmed}
                  onChange={(e) =>
                    setContentGuardModal({
                      ...contentGuardModal,
                      confirmed: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded accent-[#D92D50] cursor-pointer"
                />
                <span className="text-xs font-bold text-[#111111]">
                  I am not promising specific results
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContentGuardModal(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!contentGuardModal.confirmed}
                onClick={handleConfirmGuardShare}
                className={`px-4 py-2 rounded-full text-xs font-bold text-white transition-all cursor-pointer ${
                  contentGuardModal.confirmed
                    ? 'bg-[#D92D50] hover:bg-[#b52240]'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                Share now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ACCEPT & UPDATE PACKAGE MODAL */}
      {/* ========================================================================= */}
      {acceptModalSuggestion && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] max-w-md w-full p-6 shadow-2xl border border-black/10 space-y-4">
            <div className="flex items-center justify-between border-b border-black/5 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <h3 className="font-bold text-base text-[#111111]">Mark Suggestion Accepted</h3>
              </div>
              <button
                type="button"
                onClick={() => setAcceptModalSuggestion(null)}
                className="p-1.5 text-gray-400 hover:text-black rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B] leading-relaxed">
              Client has approved &ldquo;{acceptModalSuggestion.title}&rdquo;. You can confirm or update their active package below. Revenue continues to be calculated solely from Payment records.
            </p>

            <div className="space-y-3 bg-[#FAF8F8] p-4 rounded-xl border border-black/5">
              <div>
                <label className="block text-xs font-bold text-[#111111] mb-1">
                  Client Package Update
                </label>
                <select
                  value={selectedNewPackage}
                  onChange={(e) => setSelectedNewPackage(e.target.value as ClientPackage)}
                  className="w-full text-xs bg-white px-3 py-2 rounded-xl border border-black/10 focus:outline-none cursor-pointer font-semibold"
                >
                  <option value="Regular">Regular (Current: {client.package})</option>
                  <option value="Advanced">Advanced Tier</option>
                  <option value="Premium">Premium Tier</option>
                </select>
                <span className="text-[11px] text-[#A8A5A5] mt-1 block">
                  Current active package: <strong>{client.package}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptModalSuggestion(null)}
                className="px-4 py-2 rounded-full text-xs font-bold text-[#6B6B6B] hover:text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                className="px-4 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
              >
                Confirm & Mark Accepted
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
